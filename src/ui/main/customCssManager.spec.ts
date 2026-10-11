import fs from 'fs';
import os from 'os';
import path from 'path';

import type { WebContents } from 'electron';

import type * as CustomCssManager from './customCssManager';

let mockUserDataDir = '';

jest.mock('electron', () => ({
  app: {
    getPath: jest.fn((name: string) => {
      if (name === 'userData') {
        return mockUserDataDir;
      }
      return '';
    }),
  },
}));

describe('customCssManager', () => {
  let tempDir: string;
  let customCssPath: string;
  let customShellCssPath: string;
  let watchListener: ((eventType: string, filename: string) => void) | null =
    null;
  let customCssManager: typeof CustomCssManager;

  const createMockWebContents = () => {
    const listeners = new Map<string, (...args: any[]) => void>();
    let destroyed = false;

    const wc = {
      isDestroyed: jest.fn(() => destroyed),
      insertCSS: jest
        .fn()
        .mockImplementation(async (css: string) => `key-${css.length}`),
      removeInsertedCSS: jest.fn().mockResolvedValue(undefined),
      on: jest.fn((event: string, handler: (...args: any[]) => void) => {
        listeners.set(event, handler);
        return wc;
      }),
      emit: (event: string, ...args: any[]) => {
        const handler = listeners.get(event);
        if (handler) handler(...args);
      },
      destroy: () => {
        destroyed = true;
        const handler = listeners.get('destroyed');
        if (handler) handler();
      },
    } as unknown as WebContents & {
      emit: (event: string, ...args: any[]) => void;
      destroy: () => void;
    };

    return wc;
  };

  beforeEach(() => {
    jest.resetModules();
    watchListener = null;

    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rc-css-test-'));
    mockUserDataDir = tempDir;
    customCssPath = path.join(tempDir, 'custom.css');
    customShellCssPath = path.join(tempDir, 'custom-shell.css');

    jest.spyOn(fs, 'watch').mockImplementation((_dir: any, listener: any) => {
      watchListener = listener;
      return { close: jest.fn() } as any;
    });

    customCssManager = require('./customCssManager');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  it('injects initial workspace CSS when file exists', async () => {
    const css = 'body { background: red; }';
    fs.writeFileSync(customCssPath, css, 'utf8');

    const wc = createMockWebContents();
    customCssManager.setupWorkspaceCss(wc);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(wc.insertCSS).toHaveBeenCalledWith(css);
  });

  it('injects initial shell CSS when file exists', async () => {
    const css = '.shell { background: blue; }';
    fs.writeFileSync(customShellCssPath, css, 'utf8');

    const wc = createMockWebContents();
    customCssManager.setupShellCss(wc);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(wc.insertCSS).toHaveBeenCalledWith(css);
  });

  it('re-applies CSS when did-finish-load fires on webContents', async () => {
    const css = 'body { color: green; }';
    fs.writeFileSync(customCssPath, css, 'utf8');

    const wc = createMockWebContents();
    customCssManager.setupWorkspaceCss(wc);

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(wc.insertCSS).toHaveBeenCalledTimes(1);

    // Trigger reload
    wc.emit('did-finish-load');
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(wc.insertCSS).toHaveBeenCalledTimes(2);
  });

  it('updates CSS on live file changes via fs.watch', async () => {
    const initialCss = 'body { color: black; }';
    const updatedCss = 'body { color: white; }';
    fs.writeFileSync(customCssPath, initialCss, 'utf8');

    const wc = createMockWebContents();
    customCssManager.setupWorkspaceCss(wc);

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(wc.insertCSS).toHaveBeenCalledWith(initialCss);

    fs.writeFileSync(customCssPath, updatedCss, 'utf8');
    expect(watchListener).toBeDefined();
    watchListener!('change', 'custom.css');

    // Wait for debounce (100ms) + execution
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(wc.removeInsertedCSS).toHaveBeenCalledWith(
      `key-${initialCss.length}`
    );
    expect(wc.insertCSS).toHaveBeenCalledWith(updatedCss);
  });

  it('debounces rapid file changes', async () => {
    const finalCss = 'body { font-size: 20px; }';
    fs.writeFileSync(customCssPath, finalCss, 'utf8');

    const wc = createMockWebContents();
    customCssManager.setupWorkspaceCss(wc);

    await new Promise((resolve) => setTimeout(resolve, 50));
    (wc.insertCSS as jest.Mock).mockClear();

    // Trigger multiple watch events rapidly
    watchListener!('change', 'custom.css');
    watchListener!('change', 'custom.css');
    watchListener!('change', 'custom.css');

    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(wc.insertCSS).toHaveBeenCalledTimes(1);
  });

  it('cleans up CSS when file is removed', async () => {
    const css = 'body { margin: 0; }';
    fs.writeFileSync(customCssPath, css, 'utf8');

    const wc = createMockWebContents();
    customCssManager.setupWorkspaceCss(wc);

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(wc.insertCSS).toHaveBeenCalledWith(css);

    // Delete file
    fs.unlinkSync(customCssPath);
    watchListener!('change', 'custom.css');

    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(wc.removeInsertedCSS).toHaveBeenCalledWith(`key-${css.length}`);
  });

  it('stops applying CSS when webContents is destroyed', async () => {
    const css = 'body { padding: 10px; }';
    fs.writeFileSync(customCssPath, css, 'utf8');

    const wc = createMockWebContents();
    customCssManager.setupWorkspaceCss(wc);

    await new Promise((resolve) => setTimeout(resolve, 50));
    (wc.insertCSS as jest.Mock).mockClear();

    wc.destroy();

    // Trigger file update after destruction
    fs.writeFileSync(customCssPath, 'body { padding: 20px; }', 'utf8');
    watchListener!('change', 'custom.css');

    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(wc.insertCSS).not.toHaveBeenCalled();
  });
});
