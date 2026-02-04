import fs, { createWriteStream } from 'fs';
import path from 'path';
import { promisify } from 'util';

import archiver from 'archiver';
import type { Event } from 'electron';
import { app, BrowserWindow, screen, dialog } from 'electron';

import { packageJsonInformation } from '../app/main/app';
import { handle } from '../ipc/main';
import { getRootWindow } from '../ui/main/rootWindow';
import { WINDOW_SIZE_MULTIPLIER } from './constants';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

let logViewerWindow: BrowserWindow | null = null;
const allowedLogPaths = new Set<string>();

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

const LOG_ENTRY_REGEX = /^\[([^\]]+)\] \[([^\]]+)\]/;

const getLastNEntries = (
  content: string,
  limit: number
): { content: string; totalEntries: number } => {
  const lines = content.split('\n');
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

export const openLogViewerWindow = async (): Promise<void> => {
  if (logViewerWindow && !logViewerWindow.isDestroyed()) {
    logViewerWindow.focus();
    return;
  }

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

  logViewerWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    title: 'Log Viewer - Rocket.Chat',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(app.getAppPath(), 'app/preload/log-viewer-preload.js'),
    },
    show: false,
  });

  logViewerWindow.loadFile(
    path.join(app.getAppPath(), 'app/log-viewer-window.html')
  );

  logViewerWindow.once('ready-to-show', () => {
    logViewerWindow?.setTitle(
      `Log Viewer - ${packageJsonInformation.productName}`
    );
    logViewerWindow?.show();
  });

  logViewerWindow.on('closed', () => {
    logViewerWindow = null;
  });

  logViewerWindow.webContents.on(
    'will-navigate',
    (event: Event, url: string) => {
      if (!url.startsWith('file://')) {
        event.preventDefault();
      }
    }
  );

  logViewerWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
};

export const startLogViewerWindowHandler = (): void => {
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
        title: 'Select Log File',
        filters: [
          { name: 'Log Files', extensions: ['log', 'txt'] },
          { name: 'All Files', extensions: ['*'] },
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

        if (!fs.existsSync(logPath)) {
          if (!options?.filePath) {
            const logDir = path.dirname(logPath);
            if (!fs.existsSync(logDir)) {
              fs.mkdirSync(logDir, { recursive: true });
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
        } else {
          const result = getLastNEntries(fileContent, limit);
          logContent = result.content;
          totalEntries = result.totalEntries;
        }

        const stats = fs.statSync(logPath);
        const lastModifiedTime = stats.mtime.getTime();

        return {
          success: true,
          logs: logContent,
          filePath: logPath,
          fileName: path.basename(logPath),
          isDefaultLog: !options?.filePath,
          lastModifiedTime,
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

        if (!fs.existsSync(logPath)) {
          return { success: false, error: 'Log file does not exist' };
        }

        const stats = fs.statSync(logPath);
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
          title: 'Save Log File',
          defaultPath: options.defaultFileName,
          filters: [
            { name: 'ZIP Files', extensions: ['zip'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        });

        if (result.canceled || !result.filePath) {
          return { success: false, canceled: true };
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
};
