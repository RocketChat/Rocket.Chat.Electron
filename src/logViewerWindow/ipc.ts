import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

import type { Event } from 'electron';
import { app, BrowserWindow, ipcMain, screen, dialog } from 'electron';

import { packageJsonInformation } from '../app/main/app';
import { handle } from '../ipc/main';
import { debounce } from '../ui/main/debounce';
import { getRootWindow } from '../ui/main/rootWindow';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

let logViewerWindow: BrowserWindow | null = null;

const getLogFilePath = (): string => {
  // Use electron-log's default path: ~/Library/Logs/{app name}/main.log
  const logsPath = app.getPath('logs');
  return path.join(logsPath, 'main.log');
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

  const width = Math.round(actualScreen.workAreaSize.width * 0.8);
  const height = Math.round(actualScreen.workAreaSize.height * 0.8);
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
      nodeIntegration: true,
      nodeIntegrationInSubFrames: true,
      contextIsolation: false,
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

  // Block navigation to external URLs
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
  // Register the window opener handler
  handle('log-viewer-window/open-window', openLogViewerWindow);

  // Register all log viewer IPC handlers once globally

  // Handle close request
  handle('log-viewer-window/close-requested', async () => {
    logViewerWindow?.close();
  });

  // Handle log file selection
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

      return {
        success: true,
        filePath: result.filePaths[0],
        fileName: path.basename(result.filePaths[0]),
      };
    } catch (error) {
      console.error('Failed to select log file:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Handle log file reading
  handle(
    'log-viewer-window/read-logs',
    async (_, options?: { filePath?: string; limit?: number | 'all' }) => {
      try {
        const logPath = options?.filePath || getLogFilePath();
        const limit = options?.limit;

        // Check if file exists, if not create it (only for default log)
        if (!fs.existsSync(logPath)) {
          if (!options?.filePath) {
            // Only create default log file if it doesn't exist
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

        if (limit === 'all' || !limit) {
          // Read entire file
          logContent = await readFile(logPath, 'utf-8');
        } else {
          // Read only the last N lines efficiently
          const fileContent = await readFile(logPath, 'utf-8');
          const lines = fileContent.split('\n');

          // Take the last 'limit' lines, but keep empty lines for proper parsing
          const limitedLines = lines.slice(-limit);
          logContent = limitedLines.join('\n');
        }

        // Get file modification time for smart refresh
        const stats = fs.statSync(logPath);
        const lastModifiedTime = stats.mtime.getTime();

        return {
          success: true,
          logs: logContent,
          filePath: logPath,
          fileName: path.basename(logPath),
          isDefaultLog: !options?.filePath,
          lastModifiedTime,
        };
      } catch (error) {
        console.error('Failed to read log file:', error);
        return { success: false, error: (error as Error).message };
      }
    }
  );

  // Handle log file clearing (only for default log)
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
};
