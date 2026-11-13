import fs from 'fs';
import path from 'path';

import type { WebContents } from 'electron';
import { app } from 'electron';

type CssTarget = 'shell' | 'workspace';

const cssCache: Record<CssTarget, string> = {
  shell: '',
  workspace: '',
};

const registry: Record<CssTarget, Set<WebContents>> = {
  shell: new Set(),
  workspace: new Set(),
};

const activeKeys = new WeakMap<WebContents, string>();

let managerInitialized = false;

const applyPromises = new WeakMap<WebContents, Promise<void>>();

const applyCssToWebContents = (webContents: WebContents, target: CssTarget) => {
  const currentPromise = applyPromises.get(webContents) || Promise.resolve();
  const newPromise = currentPromise.then(async () => {
    if (webContents.isDestroyed()) {
      registry[target].delete(webContents);
      return;
    }

    const currentKey = activeKeys.get(webContents);
    if (currentKey) {
      try {
        await webContents.removeInsertedCSS(currentKey);
      } catch (err) {
        // Ignore errors if css is already cleared by navigation
      }
      activeKeys.delete(webContents);
    }

    const css = cssCache[target];
    if (css && css.trim().length > 0) {
      try {
        const key = await webContents.insertCSS(css);
        activeKeys.set(webContents, key);
      } catch (err) {
        console.error(`[CustomCSS] Failed to insert ${target} CSS:`, err);
      }
    }
  });

  applyPromises.set(webContents, newPromise);
  return newPromise;
};

const applyCssToAll = (target: CssTarget) => {
  for (const wc of registry[target]) {
    applyCssToWebContents(wc, target);
  }
};

const generationCounter: Record<CssTarget, number> = {
  shell: 0,
  workspace: 0,
};

const reloadCache = async (target: CssTarget, filename: string) => {
  const currentGen = ++generationCounter[target];
  const filePath = path.join(app.getPath('userData'), filename);
  let content = '';
  try {
    content = await fs.promises.readFile(filePath, 'utf8');
  } catch (err) {
    content = ''; // file removed or unreadable
  }

  if (generationCounter[target] !== currentGen) {
    return;
  }

  cssCache[target] = content;
  applyCssToAll(target);
};

const initManager = () => {
  if (managerInitialized) return;
  managerInitialized = true;

  const userDataPath = app.getPath('userData');

  // Initial load
  reloadCache('shell', 'custom-shell.css');
  reloadCache('workspace', 'custom.css');

  // Watch directory for changes to those files
  try {
    let shellTimer: NodeJS.Timeout | null = null;
    let workspaceTimer: NodeJS.Timeout | null = null;
    fs.watch(userDataPath, (_eventType, filename) => {
      if (filename === 'custom-shell.css') {
        if (shellTimer) clearTimeout(shellTimer);
        shellTimer = setTimeout(() => {
          reloadCache('shell', 'custom-shell.css');
        }, 100);
      } else if (filename === 'custom.css') {
        if (workspaceTimer) clearTimeout(workspaceTimer);
        workspaceTimer = setTimeout(() => {
          reloadCache('workspace', 'custom.css');
        }, 100);
      }
    });
  } catch (err) {
    console.error('[CustomCSS] Failed to watch userData directory:', err);
  }
};

const setupCssInjection = (webContents: WebContents, target: CssTarget) => {
  initManager();

  registry[target].add(webContents);

  // Apply immediately in case it's already loaded
  applyCssToWebContents(webContents, target);

  // Re-apply on navigations/reloads
  webContents.on('did-finish-load', () => {
    applyCssToWebContents(webContents, target);
  });

  // Cleanup on destroy
  webContents.on('destroyed', () => {
    registry[target].delete(webContents);
  });
};

export const setupShellCss = (webContents: WebContents) =>
  setupCssInjection(webContents, 'shell');
export const setupWorkspaceCss = (webContents: WebContents) =>
  setupCssInjection(webContents, 'workspace');
