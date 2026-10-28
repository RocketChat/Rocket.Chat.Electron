import { lstat, open, readdir } from 'node:fs/promises';
import path from 'node:path';

// The canary scanner for the rule "no plaintext-derived data on disk". The
// spec `noPlaintextOnDisk.main.spec.ts` uses it, and a live tool can run the
// same scan on a real profile.
//
// A Node script can import this file directly through Node type stripping
// (Node 22.18 or later). So this file uses only erasable TypeScript syntax and
// imports only `node:` builtins. It reads files only. It reports where a
// token is (path, offset, encoding) and never the bytes around it, because a
// real profile holds real messages.

export type CanaryEncoding = 'utf8' | 'latin1' | 'utf16le';

export type CanaryHit = {
  path: string;
  offset: number;
  encoding: CanaryEncoding;
};

export type CanarySkip = {
  path: string;
  reason: string;
};

export type CanaryScanResult = {
  hits: CanaryHit[];
  filesScanned: number;
  bytesScanned: number;
  // Symlinks (never followed), special files and files that could not be
  // read. A skipped file is a file with no evidence.
  skipped: CanarySkip[];
};

type CanaryPattern = {
  bytes: Buffer;
  encoding: CanaryEncoding;
};

export const MIN_CANARY_LENGTH = 8;
export const DEFAULT_CHUNK_BYTES = 1024 * 1024;

const UPPER_A = 0x41;
const UPPER_Z = 0x5a;
const CASE_BIT = 0x20;

// Lower-cases the ASCII letters of every byte. The scan folds the file bytes
// and the patterns the same way, so the match ignores ASCII case. A UTF-16LE
// pattern keeps its zero high bytes, and folding never makes a zero byte.
const foldAscii = (source: Uint8Array): Buffer => {
  const folded = Buffer.from(source);
  for (let i = 0; i < folded.length; i++) {
    const byte = folded[i];
    if (byte >= UPPER_A && byte <= UPPER_Z) folded[i] = byte | CASE_BIT;
  }
  return folded;
};

const isLatin1 = (text: string) =>
  Array.from(text).every((char) => (char.codePointAt(0) ?? 0) <= 0xff);

// The byte patterns for one token: UTF-8, Latin-1 (only when it differs from
// UTF-8, so for a non-ASCII token) and UTF-16LE, for the lower-case and the
// upper-case form of the token.
export const canaryPatterns = (token: string): CanaryPattern[] => {
  const patterns = new Map<string, CanaryPattern>();
  const add = (bytes: Buffer, encoding: CanaryEncoding) => {
    const folded = foldAscii(bytes);
    const key = `${encoding}:${folded.toString('hex')}`;
    if (!patterns.has(key)) patterns.set(key, { bytes: folded, encoding });
  };
  for (const variant of new Set([token.toLowerCase(), token.toUpperCase()])) {
    const utf8 = Buffer.from(variant, 'utf8');
    add(utf8, 'utf8');
    if (isLatin1(variant)) {
      const latin1 = Buffer.from(variant, 'latin1');
      if (!latin1.equals(utf8)) add(latin1, 'latin1');
    }
    add(Buffer.from(variant, 'utf16le'), 'utf16le');
  }
  return [...patterns.values()];
};

const assertToken = (token: string) => {
  if (token.trim().length < MIN_CANARY_LENGTH) {
    throw new RangeError(
      `canary token must have at least ${MIN_CANARY_LENGTH} characters`
    );
  }
};

// Finds the patterns in `haystack` (already folded). It reports a match only
// when the match ends at or after `newFrom`: a match that ends before it was
// in the overlap of the previous chunk, and was reported then.
const findPatterns = (
  haystack: Buffer,
  patterns: CanaryPattern[],
  newFrom: number,
  baseOffset: number,
  onHit: (offset: number, encoding: CanaryEncoding) => void
) => {
  for (const { bytes, encoding } of patterns) {
    let index = haystack.indexOf(bytes);
    while (index !== -1) {
      if (index + bytes.length > newFrom) onHit(baseOffset + index, encoding);
      index = haystack.indexOf(bytes, index + 1);
    }
  }
};

// Scans bytes in memory. The spec uses it on a decrypted snapshot, which
// must never be written to disk.
export const findCanaryInBuffer = (
  data: Uint8Array,
  token: string
): Array<Omit<CanaryHit, 'path'>> => {
  assertToken(token);
  const hits: Array<Omit<CanaryHit, 'path'>> = [];
  findPatterns(
    foldAscii(data),
    canaryPatterns(token),
    0,
    0,
    (offset, encoding) => hits.push({ offset, encoding })
  );
  return hits;
};

const scanFile = async (
  file: string,
  patterns: CanaryPattern[],
  chunkBytes: number,
  onHit: (offset: number, encoding: CanaryEncoding) => void
): Promise<number> => {
  const overlap = Math.max(...patterns.map(({ bytes }) => bytes.length)) - 1;
  const handle = await open(file, 'r');
  try {
    let tail: Buffer = Buffer.alloc(0);
    let position = 0;
    const chunk = Buffer.alloc(chunkBytes);
    for (;;) {
      // eslint-disable-next-line no-await-in-loop -- each chunk needs the tail of the one before it
      const { bytesRead } = await handle.read(chunk, 0, chunkBytes, position);
      if (bytesRead === 0) break;
      const haystack = Buffer.concat([
        tail,
        foldAscii(chunk.subarray(0, bytesRead)),
      ]);
      findPatterns(
        haystack,
        patterns,
        tail.length,
        position - tail.length,
        onHit
      );
      position += bytesRead;
      tail = haystack.subarray(Math.max(0, haystack.length - overlap));
    }
    return position;
  } finally {
    await handle.close();
  }
};

// Scans every regular file under `dir`, recursively. It follows no symlink,
// and it does not open a special file (a FIFO would block the read).
export const scanDirForCanary = async (
  dir: string,
  token: string,
  { chunkBytes = DEFAULT_CHUNK_BYTES }: { chunkBytes?: number } = {}
): Promise<CanaryScanResult> => {
  assertToken(token);
  const patterns = canaryPatterns(token);
  const longest = Math.max(...patterns.map(({ bytes }) => bytes.length));
  if (!Number.isInteger(chunkBytes) || chunkBytes < longest) {
    throw new RangeError(`chunkBytes must be an integer >= ${longest}`);
  }

  const result: CanaryScanResult = {
    hits: [],
    filesScanned: 0,
    bytesScanned: 0,
    skipped: [],
  };

  const visit = async (entryPath: string): Promise<void> => {
    let stats;
    try {
      stats = await lstat(entryPath);
    } catch (error) {
      result.skipped.push({
        path: entryPath,
        reason: (error as NodeJS.ErrnoException).code ?? 'lstat failed',
      });
      return;
    }

    if (stats.isSymbolicLink()) {
      result.skipped.push({ path: entryPath, reason: 'symlink' });
      return;
    }

    if (stats.isDirectory()) {
      let names: string[];
      try {
        names = await readdir(entryPath);
      } catch (error) {
        result.skipped.push({
          path: entryPath,
          reason: (error as NodeJS.ErrnoException).code ?? 'readdir failed',
        });
        return;
      }
      for (const name of names.sort()) {
        // eslint-disable-next-line no-await-in-loop -- one file at a time keeps open file handles bounded
        await visit(path.join(entryPath, name));
      }
      return;
    }

    if (!stats.isFile()) {
      result.skipped.push({ path: entryPath, reason: 'not a regular file' });
      return;
    }

    try {
      result.bytesScanned += await scanFile(
        entryPath,
        patterns,
        chunkBytes,
        (offset, encoding) =>
          result.hits.push({ path: entryPath, offset, encoding })
      );
      result.filesScanned += 1;
    } catch (error) {
      result.skipped.push({
        path: entryPath,
        reason: (error as NodeJS.ErrnoException).code ?? 'read failed',
      });
    }
  };

  const root = await lstat(dir);
  if (!root.isDirectory()) {
    throw new Error(`not a directory (symlinks are not followed): ${dir}`);
  }
  await visit(dir);
  return result;
};
