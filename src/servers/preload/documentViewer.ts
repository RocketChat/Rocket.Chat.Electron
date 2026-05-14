import { ipcRenderer } from 'electron';

export const openDocumentViewer = (
  url: string,
  format: string,
  options?: { filename?: string; isEncrypted?: boolean }
): void => {
  ipcRenderer.invoke('document-viewer/open-window', url, format, options);
};

export const downloadEncryptedDocument = (
  serverUrl: string,
  fileUrl: string,
  filename: string
): Promise<void> => {
  return ipcRenderer.invoke(
    'document-viewer/download-encrypted',
    serverUrl,
    fileUrl,
    filename
  );
};
