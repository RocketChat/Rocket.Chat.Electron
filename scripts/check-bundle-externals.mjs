#!/usr/bin/env node
/**
 * Regression guard for the 4.16.0-alpha.0 mixed-React-internals bug.
 *
 * rollup externals used to match module ids by exact name, so
 * `react-dom/client` (React 19's subpath entrypoint) did not match the
 * `react-dom` external and got bundled as production ReactDOM, while
 * `react` stayed external and resolved to development React from the
 * asar at runtime. Mixing dev/prod React internals crashes at startup.
 *
 * This script walks each entry bundle's reachable local-chunk graph and
 * fails the build if any chunk contains bundled React internals, and
 * fails if the expected `require('react')` / `require('react-dom/client')`
 * external calls are missing (which would mean this check itself has
 * gone stale and needs a conscious update).
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const appDir = join(rootDir, 'app');

// injected.js is deliberately excluded: it's a self-contained IIFE with no
// externals, so dev/prod React mixing is impossible there.
const ENTRIES = [
  'main.js',
  'rootWindow.js',
  'preload.js',
  'video-call-window.js',
  'log-viewer-window.js',
  'screen-picker-window.js',
  'preload/preload.js',
];

const REACT_INTERNAL_MARKERS = [
  '__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE',
  '__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED',
];

const LOCAL_CHUNK_PATTERN =
  /require\(['"](\.\/[^'"]+\.js)['"]\)|from ['"](\.\/[^'"]+\.js)['"]/g;

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

for (const entry of ENTRIES) {
  const entryPath = join(appDir, entry);
  if (!existsSync(entryPath)) {
    fail(
      `bundle externals check: expected entry bundle not found: app/${entry}\n` +
        'An entry may have been renamed or removed. Update ENTRIES in ' +
        'scripts/check-bundle-externals.mjs to match the current rollup ' +
        'output filenames.'
    );
  }
}

const collectReachableChunks = (entryPath) => {
  const reachable = new Map();
  const queue = [entryPath];

  while (queue.length > 0) {
    const filePath = queue.pop();
    if (reachable.has(filePath)) continue;

    const content = readFileSync(filePath, 'utf8');
    reachable.set(filePath, content);

    const dir = dirname(filePath);
    for (const match of content.matchAll(LOCAL_CHUNK_PATTERN)) {
      const relativePath = match[1] ?? match[2];
      const resolvedPath = resolve(dir, relativePath);
      if (!reachable.has(resolvedPath) && existsSync(resolvedPath)) {
        queue.push(resolvedPath);
      }
    }
  }

  return reachable;
};

const allReachable = new Map();
const entryReachable = new Map();

for (const entry of ENTRIES) {
  const entryPath = join(appDir, entry);
  const reachable = collectReachableChunks(entryPath);
  entryReachable.set(entry, reachable);
  for (const [filePath, content] of reachable) {
    allReachable.set(filePath, content);
  }
}

for (const [filePath, content] of allReachable) {
  for (const marker of REACT_INTERNAL_MARKERS) {
    if (content.includes(marker)) {
      fail(
        `bundle externals check FAILED\n` +
          `File: ${filePath}\n` +
          `Marker: ${marker}\n` +
          'React/ReactDOM internals were found bundled into this chunk ' +
          'instead of being externalized. This happens when a rollup ' +
          '`external` matcher fails to match a module id (e.g. exact-name ' +
          'matching missing a subpath entrypoint like `react-dom/client`), ' +
          'causing that module to be bundled as production code while a ' +
          'related module (e.g. `react`) stays external and resolves to a ' +
          'different (dev) copy at runtime, mixing incompatible React ' +
          'internals and crashing at startup. Check the `makeExternal` ' +
          'matcher in rollup.config.mjs.'
      );
    }
  }
}

const assertContains = (entry, needle) => {
  const reachable = entryReachable.get(entry);
  const found = [...reachable.values()].some((content) =>
    content.includes(needle)
  );
  if (!found) {
    fail(
      `bundle externals check FAILED\n` +
        `Entry: app/${entry}\n` +
        `Expected to find: ${needle}\n` +
        'The external-require pattern for this entry has changed. This ' +
        'script needs a conscious update to match the new pattern before ' +
        'the build can be trusted.'
    );
  }
};

assertContains('rootWindow.js', "require('react')");
assertContains('rootWindow.js', "require('react-dom/client')");
assertContains('screen-picker-window.js', "require('react')");
assertContains('screen-picker-window.js', "require('react-dom/client')");
assertContains('log-viewer-window.js', "require('react')");
assertContains('log-viewer-window.js', "require('react-dom/client')");
assertContains('video-call-window.js', "require('react')");
assertContains('video-call-window.js', "require('react-dom/client')");

console.log(
  `bundle externals check passed (${allReachable.size} chunks scanned)`
);
