import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { gunzip } from 'zlib';

import { app, net } from 'electron';

// Published by Rocket.Chat's `UI Preview` workflow; public, so pulls need no GitHub login.
const registry = 'https://ghcr.io';
const repository = 'rocketchat/rocket.chat-web';

export const getUiPreviewReference = (tag: string) =>
  `ghcr.io/${repository}:${tag}`;

const getUiPreviewsDir = () =>
  path.join(app.getPath('userData'), 'ui-previews');

// Bundles kept besides the ones in use, so switching between recent builds skips the download.
const recentBundlesKept = 3;

// A pull interrupted by a quit or crash leaves its `.partial-` directory behind; a live one is never this old.
const abandonedPartialAgeMs = 60 * 60 * 1000;

// ponytail: ustar only (files and directories), which is what the workflow writes with `tar --format=ustar`.
// Async so writing a few thousand bundle files never blocks the main process; every path is checked before the first write.
export const extractTar = async (
  tar: Buffer,
  targetDir: string
): Promise<void> => {
  const root = path.resolve(targetDir);
  const entries: Array<{ target: string; data?: Buffer }> = [];

  for (let offset = 0; offset + 512 <= tar.length; ) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) {
      break;
    }

    const field = (start: number, length: number) =>
      header
        .subarray(start, start + length)
        .toString('utf8')
        .replace(/\0[\s\S]*$/, '');
    const name = field(0, 100);
    const prefix = field(345, 155);
    const size = parseInt(field(124, 12).trim() || '0', 8);
    const type = field(156, 1) || '0';
    const dataStart = offset + 512;
    offset = dataStart + Math.ceil(size / 512) * 512;

    const entryName = prefix ? `${prefix}/${name}` : name;
    const target = path.resolve(root, entryName);
    if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
      throw new Error(`Unsafe path in UI preview bundle: ${entryName}`);
    }

    if (type === '5') {
      entries.push({ target });
    } else if (type === '0') {
      entries.push({ target, data: tar.subarray(dataStart, dataStart + size) });
    }
  }

  const write = async ({ target, data }: (typeof entries)[number]) => {
    if (!data) {
      await fs.promises.mkdir(target, { recursive: true });
      return;
    }
    await fs.promises.mkdir(path.dirname(target), { recursive: true });
    await fs.promises.writeFile(target, data);
  };

  await fs.promises.mkdir(root, { recursive: true });
  for (const entry of entries) {
    // eslint-disable-next-line no-await-in-loop -- one file at a time keeps open file handles bounded
    await write(entry);
  }
};

const fetchOk = async (url: string, init?: RequestInit) => {
  const response = await net.fetch(url, init);
  if (!response.ok) {
    throw new Error(`${url} responded ${response.status}`);
  }
  return response;
};

export type UiPreviewBuild = {
  // The bundle layer's digest, which changes with every published build.
  digest: string;
  // The Rocket.Chat commit the bundle was built from, when the workflow recorded it.
  revision?: string;
  // When the workflow published the build, as an ISO date.
  createdAt?: string;
};

export type UiPreviewPackage = UiPreviewBuild & {
  dir: string;
};

const authorize = async () => {
  const { token } = await (
    await fetchOk(`${registry}/token?scope=repository:${repository}:pull`)
  ).json();
  return { Authorization: `Bearer ${token}` };
};

const readManifest = async (
  tag: string,
  headers: Record<string, string>
): Promise<UiPreviewBuild> => {
  const url = `${registry}/v2/${repository}/manifests/${tag}`;
  const response = await net.fetch(url, {
    headers: {
      ...headers,
      Accept: 'application/vnd.oci.image.manifest.v1+json',
    },
  });
  if (response.status === 404) {
    throw new Error(`${getUiPreviewReference(tag)} was not found`);
  }
  if (!response.ok) {
    throw new Error(`${url} responded ${response.status}`);
  }
  const manifest = await response.json();

  const digest: unknown = manifest.layers?.[0]?.digest;
  if (typeof digest !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(digest)) {
    throw new Error(`${getUiPreviewReference(tag)} has no bundle layer`);
  }

  const annotatedRevision: unknown =
    manifest.annotations?.['org.opencontainers.image.revision'];
  const revision =
    typeof annotatedRevision === 'string' &&
    /^[a-f0-9]{7,40}$/.test(annotatedRevision)
      ? annotatedRevision
      : undefined;

  const annotatedCreatedAt: unknown =
    manifest.annotations?.['org.opencontainers.image.created'];
  const createdAt =
    typeof annotatedCreatedAt === 'string' &&
    !Number.isNaN(Date.parse(annotatedCreatedAt))
      ? new Date(annotatedCreatedAt).toISOString()
      : undefined;

  return { digest, revision, createdAt };
};

// Reads the manifest only, so checking a tag never downloads its bundle.
export const inspectUiPreview = async (tag: string): Promise<UiPreviewBuild> =>
  readManifest(tag, await authorize());

// Resolves to a local directory holding the bundle; each layer digest is extracted once and reused.
export const pullUiPreview = async (tag: string): Promise<UiPreviewPackage> => {
  const headers = await authorize();
  const build = await readManifest(tag, headers);
  const { digest } = build;
  const hash = digest.slice('sha256:'.length);

  const dir = path.join(getUiPreviewsDir(), hash);
  if (fs.existsSync(path.join(dir, 'index.html'))) {
    // Marks the bundle as recently used, so pruning keeps it.
    const now = new Date();
    await fs.promises.utimes(dir, now, now);
    return { ...build, dir };
  }

  const blob = Buffer.from(
    await (
      await fetchOk(`${registry}/v2/${repository}/blobs/${digest}`, {
        headers,
      })
    ).arrayBuffer()
  );
  if (createHash('sha256').update(blob).digest('hex') !== hash) {
    throw new Error(`${getUiPreviewReference(tag)} failed digest check`);
  }

  // Unique per pull, so a concurrent pull of the same digest never removes a completed bundle.
  await fs.promises.mkdir(path.dirname(dir), { recursive: true });
  const partialDir = await fs.promises.mkdtemp(`${dir}.partial-`);
  try {
    await extractTar(await promisify(gunzip)(blob), partialDir);
    // Synchronous from the check to the rename, so two pulls of one digest can't both move into place.
    if (!fs.existsSync(path.join(dir, 'index.html'))) {
      fs.rmSync(dir, { recursive: true, force: true });
      fs.renameSync(partialDir, dir);
    }
  } finally {
    await fs.promises.rm(partialDir, { recursive: true, force: true });
  }

  return { ...build, dir };
};

// Keeps the bundles in use and the most recently pulled ones; every other extracted build is removed.
export const pruneUiPreviews = async (inUse: string[]): Promise<void> => {
  const root = getUiPreviewsDir();
  const entries = await fs.promises
    .readdir(root, { withFileTypes: true })
    .catch(() => []);

  const dirs = (
    await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map(async ({ name }) => {
          const dir = path.join(root, name);
          // Gone already when a pull just moved or removed it.
          const stats = await fs.promises.stat(dir).catch(() => undefined);
          return stats && { name, dir, mtimeMs: stats.mtimeMs };
        })
    )
  ).filter((entry) => entry !== undefined);

  const bundles = dirs
    .filter(({ name }) => /^[a-f0-9]{64}$/.test(name))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
  const kept = new Set([
    ...inUse.map((dir) => path.resolve(dir)),
    ...bundles.slice(0, recentBundlesKept).map(({ dir }) => dir),
  ]);
  const abandonedPartials = dirs.filter(
    ({ name, mtimeMs }) =>
      /^[a-f0-9]{64}\.partial-/.test(name) &&
      Date.now() - mtimeMs > abandonedPartialAgeMs
  );

  await Promise.all(
    [...bundles.filter(({ dir }) => !kept.has(dir)), ...abandonedPartials].map(
      ({ dir }) => fs.promises.rm(dir, { recursive: true, force: true })
    )
  );
};
