import fs, { createWriteStream } from 'fs';
import path from 'path';

import archiver from 'archiver';
import type { Event } from 'electron';
import { app, BrowserWindow, screen, dialog, shell } from 'electron';
import i18next from 'i18next';

import { packageJsonInformation } from '../app/main/app';
import { handle } from '../ipc/main';
import { getHost } from '../logging/context';
import { dispatch, select, watch } from '../store';
import type { RootState } from '../store/rootReducer';
import { LOG_VIEWER_WINDOW_OPEN_STATE_CHANGED } from '../ui/actions';
import { getRootWindow } from '../ui/main/rootWindow';
import { watchWindowControls } from '../ui/main/secondaryWindowControls';
import { focusSecondaryWindow } from '../ui/main/secondaryWindowFocus';
import {
  getSavedWindowBounds,
  watchWindowBounds,
} from '../ui/main/secondaryWindowState';
import {
  NOT_FULL_SCREENABLE,
  getTitleBarOptions,
} from '../ui/windowChrome/appearance';
import {
  TRANSPARENCY_CHANNEL,
  WINDOW_MIN_HEIGHT,
  WINDOW_MIN_WIDTH,
  WINDOW_SIZE_MULTIPLIER,
} from './constants';

const t = i18next.t.bind(i18next);

const isMac = process.platform === 'darwin';

const { readFile, writeFile, mkdir, stat } = fs.promises;

const pathExists = async (targetPath: string): Promise<boolean> => {
  try {
    await stat(targetPath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
};

let logViewerWindow: BrowserWindow | null = null;
const allowedLogPaths = new Set<string>();

/**
 * Set once quitting starts. The window's `closed` handler fires both when the
 * reader closes it and when the app tears its windows down on quit; without this
 * the quit path would record "closed" and defeat restoring it next launch.
 */
let isAppQuitting = false;

const selectIsTransparencyEnabled = ({
  isTransparentWindowEnabled,
}: RootState): boolean => isTransparentWindowEnabled;

const getLogFilePath = (): string => {
  const logsPath = app.getPath('logs');
  return path.join(logsPath, 'main.log');
};

const validateLogFilePath = (
  filePath: string
): { valid: boolean; error?: string } => {
  const normalizedPath = path.normalize(filePath);

  if (filePath.includes('..') || normalizedPath.includes('..')) {
    return { valid: false, error: 'Path traversal not allowed' };
  }

  if (!path.isAbsolute(normalizedPath)) {
    return { valid: false, error: 'Only absolute paths are allowed' };
  }

  const ext = path.extname(normalizedPath).toLowerCase();
  if (ext !== '.log' && ext !== '.txt') {
    return { valid: false, error: 'Only .log and .txt files are allowed' };
  }

  return { valid: true };
};

const LOG_ENTRY_REGEX = /^\[([^\]]+)\]\s+\[([^\]]+)\]/;

export const countLogEntries = (content: string): number => {
  const lines = content.split(/\r?\n/);
  let count = 0;
  lines.forEach((line) => {
    if (LOG_ENTRY_REGEX.test(line)) {
      count += 1;
    }
  });
  return count;
};

export const getLastNEntries = (
  content: string,
  limit: number
): { content: string; totalEntries: number } => {
  if (limit <= 0) {
    return { content: '', totalEntries: 0 };
  }

  const lines = content.split(/\r?\n/);
  const entryStartIndices: number[] = [];

  lines.forEach((line, index) => {
    if (LOG_ENTRY_REGEX.test(line)) {
      entryStartIndices.push(index);
    }
  });

  const totalEntries = entryStartIndices.length;

  if (totalEntries === 0) {
    return { content: lines.slice(-limit).join('\n'), totalEntries: 0 };
  }

  const startEntryIndex = Math.max(0, totalEntries - limit);
  const startLineIndex = entryStartIndices[startEntryIndex];

  return {
    content: lines.slice(startLineIndex).join('\n'),
    totalEntries,
  };
};

const NEWLINE_BYTE = 0x0a;

export const trimBufferToLastNewline = (
  buf: Buffer
): { consumed: Buffer; bytesConsumed: number } => {
  const lastNewlineIndex = buf.lastIndexOf(NEWLINE_BYTE);

  if (lastNewlineIndex === -1) {
    return { consumed: Buffer.alloc(0), bytesConsumed: 0 };
  }

  const bytesConsumed = lastNewlineIndex + 1;
  return { consumed: buf.subarray(0, bytesConsumed), bytesConsumed };
};

/** Set while a window is being built; see `createLogViewerWindow`. */
let pendingCreation: Promise<void> | null = null;

const buildLogViewerWindow = async (focusOnShow: boolean): Promise<void> => {
  const mainWindow = await getRootWindow();
  const winBounds = await mainWindow.getNormalBounds();

  const centeredWindowPosition = {
    x: winBounds.x + winBounds.width / 2,
    y: winBounds.y + winBounds.height / 2,
  };

  const actualScreen = screen.getDisplayNearestPoint({
    x: centeredWindowPosition.x,
    y: centeredWindowPosition.y,
  });

  const width = Math.round(
    actualScreen.workAreaSize.width * WINDOW_SIZE_MULTIPLIER
  );
  const height = Math.round(
    actualScreen.workAreaSize.height * WINDOW_SIZE_MULTIPLIER
  );
  const x = Math.round(
    (actualScreen.workArea.width - width) / 2 + actualScreen.workArea.x
  );
  const y = Math.round(
    (actualScreen.workArea.height - height) / 2 + actualScreen.workArea.y
  );

  // Where the reader last left this window, falling back to centred on the
  // display nearest the main window.
  const savedBounds = getSavedWindowBounds('logViewer');

  // Seeds the first paint only; the renderer then follows the setting live.
  const isTransparencyEnabled = isMac && select(selectIsTransparencyEnabled);

  logViewerWindow = new BrowserWindow({
    ...(savedBounds ?? { width, height, x, y }),
    minWidth: WINDOW_MIN_WIDTH,
    minHeight: WINDOW_MIN_HEIGHT,
    title: 'Log Viewer - Rocket.Chat',
    // The toolbar doubles as the title bar wherever the platform allows it, so
    // the window shows one header instead of a native title bar stacked on an
    // in-app one.
    ...getTitleBarOptions(),
    ...NOT_FULL_SCREENABLE,
    // `transparent` cannot be toggled after creation, so — like the root window —
    // the window is always transparent with a vibrancy material on macOS and the
    // setting only decides whether the renderer paints an opaque surface over it.
    // That is what lets the setting apply without reopening the window.
    ...(isMac
      ? {
          transparent: true,
          vibrancy: 'sidebar' as const,
          visualEffectState: 'active' as const,
        }
      : {}),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    show: false,
  });

  logViewerWindow.loadFile(
    path.join(app.getAppPath(), 'app/log-viewer-window.html'),
    { query: { transparent: String(isTransparencyEnabled) } }
  );

  logViewerWindow.once('ready-to-show', () => {
    logViewerWindow?.setTitle(
      `Log Viewer - ${packageJsonInformation.productName}`
    );
    if (focusOnShow) {
      logViewerWindow?.show();
      return;
    }
    // Restored at launch: show it without stealing focus from the main window.
    logViewerWindow?.showInactive();
  });

  dispatch({ type: LOG_VIEWER_WINDOW_OPEN_STATE_CHANGED, payload: true });

  logViewerWindow.on('closed', () => {
    logViewerWindow = null;
    allowedLogPaths.clear();
    if (!isAppQuitting) {
      dispatch({
        type: LOG_VIEWER_WINDOW_OPEN_STATE_CHANGED,
        payload: false,
      });
    }
  });

  logViewerWindow.webContents.on(
    'will-navigate',
    (event: Event, url: string) => {
      if (!url.startsWith('file://')) {
        event.preventDefault();
      }
    }
  );

  watchWindowBounds('logViewer', logViewerWindow);
  watchWindowControls(logViewerWindow);

  logViewerWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
};

/**
 * Opens the window, or focuses the one already open.
 *
 * Building one awaits the main window before the module variable is assigned,
 * so two opens arriving in that gap would each build a window and the second
 * would orphan the first — visible, untracked, and impossible to close from its
 * own channel. Every caller comes through here, so only one is ever in flight.
 */
const createLogViewerWindow = async (focusOnShow: boolean): Promise<void> => {
  if (pendingCreation) await pendingCreation;

  if (logViewerWindow && !logViewerWindow.isDestroyed()) {
    focusSecondaryWindow(logViewerWindow);
    return;
  }

  pendingCreation = buildLogViewerWindow(focusOnShow).finally(() => {
    pendingCreation = null;
  });
  await pendingCreation;
};

export const openLogViewerWindow = (): Promise<void> =>
  createLogViewerWindow(true);

/**
 * Reopens the window at launch when it was open at shutdown, without taking
 * focus from the main window.
 */
export const restoreLogViewerWindow = async (): Promise<void> => {
  if (
    !select(({ isLogViewerWindowOpen }: RootState) => isLogViewerWindowOpen)
  ) {
    return;
  }
  await createLogViewerWindow(false);
};

export const startLogViewerWindowHandler = (): void => {
  app.on('before-quit', () => {
    isAppQuitting = true;
  });

  // Transparency is a renderer concern here, so a change only needs pushing to
  // the open window — no reopen, no restart.
  watch(selectIsTransparencyEnabled, (isEnabled) => {
    if (!logViewerWindow || logViewerWindow.isDestroyed()) return;
    logViewerWindow.webContents.send(TRANSPARENCY_CHANNEL, isEnabled);
  });

  handle('log-viewer-window/open-window', openLogViewerWindow);

  handle('log-viewer-window/close-requested', async () => {
    logViewerWindow?.close();
  });

  handle('log-viewer-window/select-log-file', async () => {
    try {
      if (!logViewerWindow || logViewerWindow.isDestroyed()) {
        return { success: false, error: 'Log viewer window not found' };
      }

      const result = await dialog.showOpenDialog(logViewerWindow, {
        title: t('dialog.selectLogFile.title'),
        filters: [
          {
            name: t('dialog.selectLogFile.logFiles'),
            extensions: ['log', 'txt'],
          },
          { name: t('dialog.selectLogFile.allFiles'), extensions: ['*'] },
        ],
        properties: ['openFile'],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      const selectedPath = result.filePaths[0];
      const validation = validateLogFilePath(selectedPath);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }
      const normalizedPath = path.normalize(selectedPath);
      allowedLogPaths.add(normalizedPath);
      return {
        success: true,
        filePath: normalizedPath,
        fileName: path.basename(normalizedPath),
      };
    } catch (error) {
      console.error('Failed to select log file:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  handle(
    'log-viewer-window/read-logs',
    async (_, options?: { filePath?: string; limit?: number | 'all' }) => {
      try {
        let logPath: string;
        if (options?.filePath) {
          const validation = validateLogFilePath(options.filePath);
          if (!validation.valid) {
            return { success: false, error: validation.error };
          }
          const normalizedPath = path.normalize(options.filePath);
          const defaultLogPath = path.normalize(getLogFilePath());
          if (
            normalizedPath !== defaultLogPath &&
            !allowedLogPaths.has(normalizedPath)
          ) {
            return {
              success: false,
              error:
                'Log file not authorized. Please select it via the file dialog first.',
            };
          }
          logPath = normalizedPath;
        } else {
          logPath = getLogFilePath();
        }
        const limit = options?.limit;

        if (!(await pathExists(logPath))) {
          if (!options?.filePath) {
            const logDir = path.dirname(logPath);
            if (!(await pathExists(logDir))) {
              await mkdir(logDir, { recursive: true });
            }
            await writeFile(logPath, '');
          } else {
            return {
              success: false,
              error: 'Selected log file does not exist',
            };
          }
        }

        let logContent: string;
        let totalEntries: number | undefined;
        const fileContent = await readFile(logPath, 'utf-8');

        if (limit === 'all' || !limit) {
          logContent = fileContent;
          totalEntries = countLogEntries(fileContent);
        } else {
          const result = getLastNEntries(fileContent, limit);
          logContent = result.content;
          totalEntries = result.totalEntries;
        }

        const stats = await stat(logPath);
        const lastModifiedTime = stats.mtime.getTime();

        return {
          success: true,
          logs: logContent,
          filePath: logPath,
          fileName: path.basename(logPath),
          isDefaultLog: !options?.filePath,
          lastModifiedTime,
          fileSize: stats.size,
          totalEntries,
        };
      } catch (error) {
        console.error('Failed to read log file:', error);
        return { success: false, error: (error as Error).message };
      }
    }
  );

  handle(
    'log-viewer-window/stat-log',
    async (_, options?: { filePath?: string }) => {
      try {
        let logPath: string;
        if (options?.filePath) {
          const validation = validateLogFilePath(options.filePath);
          if (!validation.valid) {
            return { success: false, error: validation.error };
          }
          const normalizedPath = path.normalize(options.filePath);
          const defaultLogPath = path.normalize(getLogFilePath());
          if (
            normalizedPath !== defaultLogPath &&
            !allowedLogPaths.has(normalizedPath)
          ) {
            return {
              success: false,
              error:
                'Log file not authorized. Please select it via the file dialog first.',
            };
          }
          logPath = normalizedPath;
        } else {
          logPath = getLogFilePath();
        }

        if (!(await pathExists(logPath))) {
          return { success: false, error: 'Log file does not exist' };
        }

        const stats = await stat(logPath);
        return {
          success: true,
          lastModifiedTime: stats.mtime.getTime(),
          size: stats.size,
        };
      } catch (error) {
        console.error('Failed to stat log file:', error);
        return { success: false, error: (error as Error).message };
      }
    }
  );

  handle(
    'log-viewer-window/read-logs-tail',
    async (_, options: { fromByte: number; filePath?: string }) => {
      try {
        let logPath: string;
        if (options.filePath) {
          const validation = validateLogFilePath(options.filePath);
          if (!validation.valid) {
            return { success: false, error: validation.error };
          }
          const normalizedPath = path.normalize(options.filePath);
          const defaultLogPath = path.normalize(getLogFilePath());
          if (
            normalizedPath !== defaultLogPath &&
            !allowedLogPaths.has(normalizedPath)
          ) {
            return {
              success: false,
              error:
                'Log file not authorized. Please select it via the file dialog first.',
            };
          }
          logPath = normalizedPath;
        } else {
          logPath = getLogFilePath();
        }

        if (!(await pathExists(logPath))) {
          return { success: false, error: 'Log file does not exist' };
        }

        const stats = await stat(logPath);
        const rawFromByte = Number(options.fromByte);
        const fromByte =
          Number.isFinite(rawFromByte) && rawFromByte >= 0
            ? Math.min(Math.floor(rawFromByte), stats.size)
            : 0;

        if (fromByte >= stats.size) {
          return {
            success: true,
            logs: '',
            newSize: fromByte,
            lastModifiedTime: stats.mtime.getTime(),
          };
        }

        const chunks: Buffer[] = [];
        await new Promise<void>((resolve, reject) => {
          const stream = fs.createReadStream(logPath, {
            start: fromByte,
            encoding: undefined,
          });
          stream.on('data', (chunk: Buffer) => chunks.push(chunk));
          stream.on('end', () => resolve());
          stream.on('error', (err) => reject(err));
        });

        const rawChunk = Buffer.concat(chunks);
        const { consumed, bytesConsumed } = trimBufferToLastNewline(rawChunk);

        if (bytesConsumed === 0) {
          return {
            success: true,
            logs: '',
            newSize: fromByte,
            lastModifiedTime: stats.mtime.getTime(),
          };
        }

        const newContent = consumed.toString('utf-8');

        return {
          success: true,
          logs: newContent,
          newSize: fromByte + bytesConsumed,
          lastModifiedTime: stats.mtime.getTime(),
        };
      } catch (error) {
        console.error('Failed to read log tail:', error);
        return { success: false, error: (error as Error).message };
      }
    }
  );

  handle(
    'log-viewer-window/reveal-log-file',
    async (_, options?: { filePath?: string }) => {
      try {
        let logPath: string;
        if (options?.filePath) {
          const validation = validateLogFilePath(options.filePath);
          if (!validation.valid) {
            return { success: false, error: validation.error };
          }
          const normalizedPath = path.normalize(options.filePath);
          const defaultLogPath = path.normalize(getLogFilePath());
          if (
            normalizedPath !== defaultLogPath &&
            !allowedLogPaths.has(normalizedPath)
          ) {
            return {
              success: false,
              error:
                'Log file not authorized. Please select it via the file dialog first.',
            };
          }
          logPath = normalizedPath;
        } else {
          logPath = getLogFilePath();
        }

        if (!(await pathExists(logPath))) {
          return { success: false, error: 'Log file does not exist' };
        }

        shell.showItemInFolder(logPath);
        return { success: true };
      } catch (error) {
        console.error('Failed to reveal log file:', error);
        return { success: false, error: (error as Error).message };
      }
    }
  );

  handle('log-viewer-window/confirm-clear-logs', async () => {
    if (!logViewerWindow || logViewerWindow.isDestroyed()) {
      return false;
    }

    const { response } = await dialog.showMessageBox(logViewerWindow, {
      type: 'warning',
      buttons: [t('dialog.clearLogs.yes'), t('dialog.clearLogs.cancel')],
      defaultId: 1,
      title: t('dialog.clearLogs.title'),
      message: t('dialog.clearLogs.message'),
      detail: t('dialog.clearLogs.detail'),
    });

    return response === 0;
  });

  handle('log-viewer-window/clear-logs', async () => {
    try {
      const logPath = getLogFilePath();
      await writeFile(logPath, '');
      return { success: true };
    } catch (error) {
      console.error('Failed to clear log file:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  handle(
    'log-viewer-window/save-logs',
    async (_, options: { content: string; defaultFileName: string }) => {
      try {
        if (!logViewerWindow || logViewerWindow.isDestroyed()) {
          return { success: false, error: 'Log viewer window not found' };
        }

        const result = await dialog.showSaveDialog(logViewerWindow, {
          title: t('dialog.saveLogFile.title'),
          defaultPath: options.defaultFileName,
          filters: [
            { name: t('dialog.saveLogFile.zipFiles'), extensions: ['zip'] },
            { name: t('dialog.saveLogFile.logFiles'), extensions: ['log'] },
            { name: t('dialog.saveLogFile.allFiles'), extensions: ['*'] },
          ],
        });

        if (result.canceled || !result.filePath) {
          return { success: false, canceled: true };
        }

        if (result.filePath.toLowerCase().endsWith('.log')) {
          await writeFile(result.filePath, options.content, 'utf-8');
          return {
            success: true,
            filePath: result.filePath,
          };
        }

        await new Promise<void>((resolve, reject) => {
          const output = createWriteStream(result.filePath!);
          const archive = archiver('zip', {
            zlib: { level: 9 },
          });

          output.on('close', () => {
            resolve();
          });

          output.on('error', (err) => {
            reject(err);
          });

          archive.on('error', (err) => {
            reject(err);
          });

          archive.pipe(output);

          const baseName = options.defaultFileName
            .replace(/\.zip$/i, '')
            .replace(/\.log$/i, '');
          const logFileName = `${baseName}.log`;

          archive.append(options.content, { name: logFileName });

          archive.finalize();
        });

        return {
          success: true,
          filePath: result.filePath,
        };
      } catch (error) {
        console.error('Failed to save log file:', error);
        return { success: false, error: (error as Error).message };
      }
    }
  );

  handle('log-viewer-window/get-server-mapping', async () => {
    try {
      const servers = select((state: RootState) => state.servers);
      if (!servers || !Array.isArray(servers)) {
        return { success: true, mapping: {} };
      }
      const mapping: Record<string, string> = {};
      servers.forEach((server: any) => {
        if (!server.url) return;
        const host = getHost(server.url);
        mapping[host] = server.title || server.url;
      });
      return { success: true, mapping };
    } catch {
      return { success: true, mapping: {} };
    }
  });
};
