import { spawn } from 'child_process';
import { mkdir, writeFile } from 'fs/promises';

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
    current.kill('SIGKILL'); // SIGKILL bypasses the app's tray/before-quit guards
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

      const electronArgs = ['.'];

      // Linux-specific flags for development
      if (process.platform === 'linux') {
        electronArgs.push('--no-sandbox');
      }

      proc = spawn(electron, electronArgs, { stdio: 'inherit' });

      proc.once('close', () => {
        proc = null;
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
        start().catch((err) =>
          console.error('Electron restart failed:', err)
        );
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

const extensions = ['.js', '.ts', '.tsx'];

export default [
  {
    external: [
      ...builtinModules,
      ...Object.keys(appManifest.dependencies),
      ...Object.keys(appManifest.devDependencies),
    ].filter((moduleName) => moduleName !== '@bugsnag/js'),
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
    external: [
      ...builtinModules,
      ...Object.keys(appManifest.dependencies),
      ...Object.keys(appManifest.devDependencies),
    ].filter((moduleName) => moduleName !== '@bugsnag/js'),
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
    external: [
      ...builtinModules,
      ...Object.keys(appManifest.dependencies),
      ...Object.keys(appManifest.devDependencies),
    ].filter((moduleName) => moduleName !== '@bugsnag/js'),
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
    external: [
      ...builtinModules,
      ...Object.keys(appManifest.dependencies),
      ...Object.keys(appManifest.devDependencies),
    ].filter(
      (moduleName) =>
        ![
          '@bugsnag/js',
          'marked',
          'marked-highlight',
          'highlight.js',
          'dompurify',
        ].includes(moduleName)
    ),
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
    external: [
      ...builtinModules,
      ...Object.keys(appManifest.dependencies),
      ...Object.keys(appManifest.devDependencies),
    ].filter((moduleName) => moduleName !== '@bugsnag/js'),
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
    external: [
      ...builtinModules,
      ...Object.keys(appManifest.dependencies),
      ...Object.keys(appManifest.devDependencies),
    ],
    input: 'src/main.ts',
    plugins: [
      copy({
        targets: [
          { src: 'src/public/*', dest: 'app' },
          { src: 'node_modules/@rocket.chat/icons/dist/*', dest: 'app/icons' },
        ],
      }),
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
