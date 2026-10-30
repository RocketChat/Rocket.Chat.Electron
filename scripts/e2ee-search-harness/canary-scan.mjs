// Looks for a token in every file under a folder, for the rule "no plaintext
// of an encrypted message on disk".
//
//   node canary-scan.mjs --dir <path> --token <string>
//
// It uses the scanner of the app's own specs
// (src/e2eeSearch/main/canaryScan.ts): UTF-8, Latin-1 and UTF-16LE, ASCII
// case ignored, no symlinks followed, nothing written. It prints only the
// path, the offset and the encoding of each hit, never the bytes around it.
// It cannot see a token inside compressed data (for example LevelDB snappy
// blocks), so a clean result is weaker evidence there.
//
// Exit codes: 0 = no hit, 1 = one hit or more, 2 = usage or scan error.
// It imports a .ts file, so it needs Node 22.18 or later.

import { parseArgs } from 'node:util';

const { scanDirForCanary } = await import(
  new URL('../../src/e2eeSearch/main/canaryScan.ts', import.meta.url).href
);

let values;
try {
  ({ values } = parseArgs({
    options: { dir: { type: 'string' }, token: { type: 'string' } },
  }));
} catch (error) {
  console.error(error.message);
  process.exit(2);
}
if (!values.dir || !values.token) {
  console.error('usage: node canary-scan.mjs --dir <path> --token <string>');
  process.exit(2);
}

let result;
try {
  result = await scanDirForCanary(values.dir, values.token);
} catch (error) {
  console.error(`scan error: ${error.code ?? error.message}: ${values.dir}`);
  process.exit(2);
}
for (const { path, offset, encoding } of result.hits) {
  console.log(`HIT ${encoding} offset=${offset} ${path}`);
}
console.error(
  `scanned ${result.filesScanned} files, ${result.bytesScanned} bytes; ` +
    `skipped ${result.skipped.length}; hits ${result.hits.length} (${values.dir})`
);
process.exit(result.hits.length > 0 ? 1 : 0);
