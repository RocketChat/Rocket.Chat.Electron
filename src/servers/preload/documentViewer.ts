import { ipcRenderer } from 'electron';

export const openDocumentViewer = (
  url: string,
  format: string,
  options: any
): void => {
  console.log('document-viewer/open-window', url, format, options);
  ipcRenderer.invoke('document-viewer/open-window', url, format, options);
};
