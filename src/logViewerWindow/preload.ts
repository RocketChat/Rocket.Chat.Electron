import { contextBridge, ipcRenderer } from 'electron';

export interface ILogViewerAPI {
  readLogs: (options?: {
    filePath?: string;
    limit?: number | 'all';
  }) => Promise<{
    success: boolean;
    logs?: string;
    filePath?: string;
    fileName?: string;
    isDefaultLog?: boolean;
    lastModifiedTime?: number;
    totalEntries?: number;
    error?: string;
  }>;
  statLog: (options?: { filePath?: string }) => Promise<{
    success: boolean;
    lastModifiedTime?: number;
    size?: number;
    error?: string;
  }>;
  clearLogs: () => Promise<{ success: boolean; error?: string }>;
  saveLogs: (options: { content: string; defaultFileName: string }) => Promise<{
    success: boolean;
    filePath?: string;
    canceled?: boolean;
    error?: string;
  }>;
  selectLogFile: () => Promise<{
    success: boolean;
    filePath?: string;
    fileName?: string;
    canceled?: boolean;
    error?: string;
  }>;
  closeWindow: () => Promise<void>;
}

const logViewerAPI: ILogViewerAPI = {
  readLogs: (options) =>
    ipcRenderer.invoke('log-viewer-window/read-logs', options),
  statLog: (options) =>
    ipcRenderer.invoke('log-viewer-window/stat-log', options),
  clearLogs: () => ipcRenderer.invoke('log-viewer-window/clear-logs'),
  saveLogs: (options) =>
    ipcRenderer.invoke('log-viewer-window/save-logs', options),
  selectLogFile: () => ipcRenderer.invoke('log-viewer-window/select-log-file'),
  closeWindow: () => ipcRenderer.invoke('log-viewer-window/close-requested'),
};

contextBridge.exposeInMainWorld('logViewerAPI', logViewerAPI);

declare global {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  interface Window {
    logViewerAPI: ILogViewerAPI;
  }
}
