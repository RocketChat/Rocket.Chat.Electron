import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

import type { Event } from 'electron';
import { app, BrowserWindow, ipcMain, screen } from 'electron';

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
    // Clean up IPC handlers
    ipcMain.removeHandler('log-viewer-window/read-logs');
    ipcMain.removeHandler('log-viewer-window/clear-logs');
    ipcMain.removeHandler('log-viewer-window/close-requested');
  });

  // Handle close request
  handle('log-viewer-window/close-requested', async () => {
    logViewerWindow?.close();
  });

  // Handle log file reading
  handle('log-viewer-window/read-logs', async () => {
    try {
      const logPath = getLogFilePath();

      // Check if file exists, if not create it
      if (!fs.existsSync(logPath)) {
        // Ensure directory exists
        const logDir = path.dirname(logPath);
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }
        // Create empty log file
        await writeFile(logPath, '');
      }

      const logContent = await readFile(logPath, 'utf-8');
      return { success: true, logs: logContent };
    } catch (error) {
      console.error('Failed to read log file:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Handle log file clearing
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
  handle('log-viewer-window/open-window', openLogViewerWindow);
};
