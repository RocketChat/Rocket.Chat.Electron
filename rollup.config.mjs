import { spawn } from 'child_process';
import fs from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import builtinModules from 'builtin-modules';
import electron from 'electron';
import copy from 'rollup-plugin-copy';

import appManifest from './package.json' with { type: 'json' };

const NODE_ENV = process.env.NODE_ENV || 'development';
const canRun =
  process.env.ROLLUP_WATCH === 'true' && process.env.NO_RUN !== 'true';

// Single shared controller across all bundle configs. Because `rollup -c -w`
// rebuilds multiple bundles on one file save, the restart is debounced so the
// whole save-batch finishes writing, then the app restarts exactly once.
const DEV_INSPECT_PORT = 9339;

const GRACEFUL_QUIT_REQUEST_TIMEOUT_MS = 2000;

// OS signals don't reach Electron's app.quit() on macOS (SIGTERM is a no-op
// there), so a graceful shutdown has to go through the Node inspector
// protocol instead. Bounded by its own timeout so a hung fetch/WebSocket
// handshake can't block killProc() from ever reaching its SIGKILL fallback.
// Resolves true once app.quit() was acknowledged by the process.
const requestGracefulQuit = () =>
  new Promise((resolve) => {
    let settled = false;
    let ws;
    let timer;
    const finish = (result) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      ws?.close();
      resolve(result);
    };

    timer = setTimeout(() => finish(false), GRACEFUL_QUIT_REQUEST_TIMEOUT_MS);

    (async () => {
      try {
        const res = await fetch(
          `http://127.0.0.1:${DEV_INSPECT_PORT}/json/list`
        );
        const [{ webSocketDebuggerUrl }] = await res.json();
        ws = new WebSocket(webSocketDebuggerUrl);
        ws.onerror = () => finish(false);
        ws.onopen = () => {
          ws.send(
            JSON.stringify({
              id: 1,
              method: 'Runtime.evaluate',
              params: {
                expression: "process.mainModule.require('electron').app.quit()",
              },
            })
          );
        };
        ws.onmessage = () => finish(true);
      } catch {
        finish(false); // inspector unreachable — process likely never finished booting
      }
    })();
  });

const electronRunner = (() => {
  let proc = null;
  let restartTimer = null;
  let starting = false;
  let hasStarted = false;

  const killProc = async () => {
    if (!proc) {
      return;
    }
    const current = proc;
    proc = null;
    const closed = new Promise((resolve) => current.once('close', resolve));

    // Try a graceful app.quit() first so Electron closes windows through its
    // normal lifecycle. Skipping straight to SIGKILL leaves a stale
    // composited frame on screen — the OS window compositor never gets the
    // close/orderOut call, so the old window appears frozen/white while the
    // new one is either hidden behind it or never gets focus.
    if (await requestGracefulQuit()) {
      const result = await Promise.race([
        closed.then(() => 'closed'),
        new Promise((resolve) => setTimeout(() => resolve('timeout'), 2500)),
      ]);
      if (result === 'closed') {
        return;
      }
    }

    current.kill('SIGKILL'); // fallback: never hang the watcher
    await Promise.race([
      closed,
      new Promise((resolve) => setTimeout(resolve, 3000)), // never hang the watcher
    ]);
  };

  const start = async () => {
    if (starting) {
      return;
    }
    starting = true;
    try {
      await killProc();
      console.log(
        hasStarted ? 'Restarting main process...' : 'Starting main process...'
      );
      hasStarted = true;

      const electronArgs = [`--inspect=${DEV_INSPECT_PORT}`, '.'];

      // Extra Chromium/Electron switches for dev tooling, e.g.
      // ELECTRON_EXTRA_LAUNCH_ARGS='--remote-debugging-port=9222' yarn start
      // Shell-style tokenization: quoted segments (including embedded quotes,
      // e.g. --js-flags="--a --b") stay single args, quotes stripped.
      const extraArgs = (
        (process.env.ELECTRON_EXTRA_LAUNCH_ARGS ?? '').match(
          /(?:[^\s"']+|"[^"]*"|'[^']*')+/g
        ) ?? []
      ).map((token) =>
        token.replace(/"([^"]*)"|'([^']*)'/g, (_, dq, sq) => dq ?? sq)
      );
      electronArgs.unshift(...extraArgs);

      // Linux-specific flags for development
      if (process.platform === 'linux') {
        electronArgs.push('--no-sandbox');
      }

      const child = spawn(electron, electronArgs, { stdio: 'inherit' });
      proc = child;

      // Guard against a stale `close` from a process that hit the kill timeout
      // firing after a newer child has already been assigned to `proc`.
      child.once('close', () => {
        if (proc === child) {
          proc = null;
        }
      });
    } finally {
      starting = false;
    }
  };

  return {
    schedule: () => {
      if (restartTimer) {
        clearTimeout(restartTimer);
      }
      restartTimer = setTimeout(() => {
        restartTimer = null;
        start().catch((err) => console.error('Electron restart failed:', err));
      }, 300); // debounce: coalesce a multi-bundle rebuild batch into one restart
    },
  };
})();

const run = () => {
  if (!canRun) {
    return { name: 'run-electron-noop' };
  }

  return {
    name: 'run-electron',
    writeBundle() {
      electronRunner.schedule();
    },
  };
};

const downloadSupportedVersions = () => {
  const apiUrl =
    'https://releases.rocket.chat/v2/server/supportedVersions?source=desktop';

  return {
    writeBundle: async () => {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch supported versions from ${apiUrl}: ${response.status} ${response.statusText}`
        );
      }

      const json = await response.json();
      const signedContent = json?.signed;

      if (!signedContent) {
        throw new Error(
          'JSON response does not contain the expected "signed" field.'
        );
      }

      await mkdir('./app', { recursive: true });
      await writeFile('./app/supportedVersions.jwt', signedContent);
      console.info('Downloaded supported versions.');
    },
  };
};

// rollup-plugin-copy only adds/overwrites files, it never deletes, so an
// asset removed from src/public would otherwise linger in app/ forever
// (stale tray icons surviving in dev and even packaged builds). It also
// doesn't register src/public with rollup's watcher, so regenerated
// PNG/ICO assets never trigger a rebuild/relaunch on their own. This plugin
// watches src/public directly and mirrors it into app/, purging anything
// under a mirrored subtree that no longer has a source counterpart.
const syncPublicAssets = () => {
  const srcDir = path.resolve('src/public');
  const destDir = path.resolve('app');

  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...walk(fullPath));
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
    return files;
  };

  return {
    name: 'sync-public-assets',
    buildStart() {
      for (const filePath of walk(srcDir)) {
        this.addWatchFile(filePath);
      }
    },
    writeBundle() {
      const srcFiles = walk(srcDir);

      // Mirror: copy every source file to its destination, creating
      // directories as needed.
      for (const srcFile of srcFiles) {
        const relPath = path.relative(srcDir, srcFile);
        const destFile = path.join(destDir, relPath);
        fs.mkdirSync(path.dirname(destFile), { recursive: true });
        fs.copyFileSync(srcFile, destFile);
      }

      // Purge: only within subtrees mirrored from src/public (currently
      // just images/), remove destination files with no source
      // counterpart, then remove directories left empty.
      const srcSubdirs = fs
        .readdirSync(srcDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);

      const srcRelSet = new Set(
        srcFiles.map((srcFile) => path.relative(srcDir, srcFile))
      );

      const purgeDir = (destSubDir) => {
        if (!fs.existsSync(destSubDir)) {
          return;
        }
        const entries = fs.readdirSync(destSubDir, { withFileTypes: true });
        for (const entry of entries) {
          const destPath = path.join(destSubDir, entry.name);
          if (entry.isDirectory()) {
            purgeDir(destPath);
            if (fs.readdirSync(destPath).length === 0) {
              fs.rmdirSync(destPath);
            }
          } else if (entry.isFile()) {
            const relPath = path.relative(destDir, destPath);
            if (!srcRelSet.has(relPath)) {
              fs.unlinkSync(destPath);
            }
          }
        }
      };

      for (const subdir of srcSubdirs) {
        const destSubDir = path.join(destDir, subdir);
        purgeDir(destSubDir);
      }
    },
  };
};

const extensions = ['.js', '.ts', '.tsx'];

// Match dependency subpaths (e.g. `react-dom/client`) as external too. An
// exact-name list leaves subpath entrypoints to be bundled at build-time
// NODE_ENV while the base package resolves from the asar at runtime, which
// can mix development and production React internals and crash the renderer.
const makeExternal = (bundledModules = []) => {
  const externalModules = [
    ...builtinModules,
    ...Object.keys(appManifest.dependencies),
    ...Object.keys(appManifest.devDependencies),
  ].filter((moduleName) => !bundledModules.includes(moduleName));
  return (id) =>
    externalModules.some(
      (moduleName) => id === moduleName || id.startsWith(`${moduleName}/`)
    );
};

export default [
  {
    external: makeExternal(['@bugsnag/js']),
    input: 'src/videoCallWindow/video-call-window.ts',
    preserveEntrySignatures: 'strict',
    plugins: [
      json(),
      replace({
        'process.env.NODE_ENV': JSON.stringify(NODE_ENV),
        'preventAssignment': true,
      }),
      babel({
        babelHelpers: 'bundled',
        extensions,
      }),
      nodeResolve({
        browser: true,
        extensions,
      }),
      commonjs(),
      run(),
    ],
    output: [
      {
        dir: 'app',
        format: 'cjs',
        sourcemap: 'inline',
        interop: 'auto',
      },
    ],
  },
  {
    external: makeExternal(['@bugsnag/js']),
    input: 'src/logViewerWindow/log-viewer-window.tsx',
    preserveEntrySignatures: 'strict',
    plugins: [
      json(),
      replace({
        'process.env.NODE_ENV': JSON.stringify(NODE_ENV),
        'preventAssignment': true,
      }),
      babel({
        babelHelpers: 'bundled',
        extensions,
      }),
      nodeResolve({
        browser: true,
        extensions,
      }),
      commonjs(),
      run(),
    ],
    output: [
      {
        dir: 'app',
        format: 'cjs',
        sourcemap: 'inline',
        interop: 'auto',
      },
    ],
  },
  {
    external: makeExternal(['@bugsnag/js']),
    input: 'src/downloadsWindow/downloads-window.tsx',
    preserveEntrySignatures: 'strict',
    plugins: [
      json(),
      replace({
        'process.env.NODE_ENV': JSON.stringify(NODE_ENV),
        'preventAssignment': true,
      }),
      babel({
        babelHelpers: 'bundled',
        extensions,
      }),
      nodeResolve({
        browser: true,
        extensions,
      }),
      commonjs(),
      run(),
    ],
    output: [
      {
        dir: 'app',
        format: 'cjs',
        sourcemap: 'inline',
        interop: 'auto',
      },
    ],
  },
  {
    external: makeExternal(['@bugsnag/js']),
    input: 'src/settingsWindow/settings-window.tsx',
    preserveEntrySignatures: 'strict',
    plugins: [
      json(),
      replace({
        'process.env.NODE_ENV': JSON.stringify(NODE_ENV),
        'preventAssignment': true,
      }),
      babel({
        babelHelpers: 'bundled',
        extensions,
      }),
      nodeResolve({
        browser: true,
        extensions,
      }),
      commonjs(),
      run(),
    ],
    output: [
      {
        dir: 'app',
        format: 'cjs',
        sourcemap: 'inline',
        interop: 'auto',
      },
    ],
  },
  {
    external: makeExternal(['@bugsnag/js']),
    input: 'src/documentViewerWindow/document-viewer-window.tsx',
    preserveEntrySignatures: 'strict',
    plugins: [
      json(),
      replace({
        'process.env.NODE_ENV': JSON.stringify(NODE_ENV),
        'preventAssignment': true,
      }),
      babel({
        babelHelpers: 'bundled',
        extensions,
      }),
      nodeResolve({
        browser: true,
        extensions,
      }),
      commonjs(),
      run(),
    ],
    output: [
      {
        dir: 'app',
        format: 'cjs',
        sourcemap: 'inline',
        interop: 'auto',
      },
    ],
  },
  {
    external: makeExternal(['@bugsnag/js']),
    input: 'src/screenSharing/screen-picker-window.tsx',
    preserveEntrySignatures: 'strict',
    plugins: [
      json(),
      replace({
        'process.env.NODE_ENV': JSON.stringify(NODE_ENV),
        'preventAssignment': true,
      }),
      babel({
        babelHelpers: 'bundled',
        extensions,
      }),
      nodeResolve({
        browser: true,
        extensions,
      }),
      commonjs(),
      run(),
    ],
    output: [
      {
        dir: 'app',
        format: 'cjs',
        sourcemap: 'inline',
        interop: 'auto',
      },
    ],
  },
  {
    external: makeExternal(['@bugsnag/js']),
    input: 'src/videoCallWindow/preload/index.ts',
    preserveEntrySignatures: 'strict',
    plugins: [
      json(),
      replace({
        'process.env.NODE_ENV': JSON.stringify(NODE_ENV),
        'preventAssignment': true,
      }),
      babel({
        babelHelpers: 'bundled',
        extensions,
      }),
      nodeResolve({
        browser: true,
        extensions,
      }),
      commonjs(),
      run(),
    ],
    output: [
      {
        dir: 'app/preload',
        entryFileNames: 'preload.js',
        format: 'cjs',
        sourcemap: 'inline',
        interop: 'auto',
      },
    ],
  },
  {
    external: makeExternal([
      '@bugsnag/js',
      'marked',
      'marked-highlight',
      'highlight.js',
      'dompurify',
    ]),
    input: 'src/rootWindow.ts',
    preserveEntrySignatures: 'strict',
    plugins: [
      json(),
      replace({
        'process.env.BUGSNAG_API_KEY': JSON.stringify(
          process.env.BUGSNAG_API_KEY
        ),
        'process.env.NODE_ENV': JSON.stringify(NODE_ENV),
        'preventAssignment': true,
      }),
      babel({
        babelHelpers: 'bundled',
        extensions,
      }),
      nodeResolve({
        browser: true,
        extensions,
      }),
      commonjs(),
      run(),
    ],
    output: {
      dir: 'app',
      format: 'cjs',
      sourcemap: true,
      interop: 'auto',
    },
  },
  {
    external: makeExternal(['@bugsnag/js']),
    input: 'src/preload.ts',
    plugins: [
      json(),
      replace({
        'process.env.BUGSNAG_API_KEY': JSON.stringify(
          process.env.BUGSNAG_API_KEY
        ),
        'process.env.NODE_ENV': JSON.stringify(NODE_ENV),
        'preventAssignment': true,
      }),
      babel({
        babelHelpers: 'bundled',
        extensions,
      }),
      nodeResolve({
        browser: true,
        extensions,
      }),
      commonjs(),
      run(),
    ],
    output: [
      {
        dir: 'app',
        format: 'cjs',
        sourcemap: 'inline',
        interop: 'auto',
      },
    ],
  },
  {
    input: 'src/injected.ts',
    plugins: [
      json(),
      replace({
        'process.env.NODE_ENV': JSON.stringify(NODE_ENV),
        'preventAssignment': true,
      }),
      babel({
        babelHelpers: 'bundled',
        extensions,
      }),
      nodeResolve({
        browser: true,
        extensions,
      }),
      commonjs(),
      run(),
    ],
    output: [
      {
        dir: 'app',
        format: 'iife',
        sourcemap: 'inline',
      },
    ],
  },
  {
    external: makeExternal(),
    input: 'src/main.ts',
    plugins: [
      copy({
        targets: [
          { src: 'node_modules/@rocket.chat/icons/dist/*', dest: 'app/icons' },
        ],
      }),
      syncPublicAssets(),
      downloadSupportedVersions(),
      json(),
      replace({
        'process.env.BUGSNAG_API_KEY': JSON.stringify(
          process.env.BUGSNAG_API_KEY
        ),
        'process.env.NODE_ENV': JSON.stringify(NODE_ENV),
        'preventAssignment': true,
      }),
      babel({
        babelHelpers: 'bundled',
        extensions,
      }),
      nodeResolve({ extensions }),
      commonjs(),
      run(),
    ],
    output: {
      dir: 'app',
      format: 'cjs',
      sourcemap: 'inline',
      interop: 'auto',
    },
  },
];
