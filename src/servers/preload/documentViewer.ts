import { ipcRenderer } from 'electron';

export const openDocumentViewer = (
  url: string,
  format: string,
  options: any
): void => {
  ipcRenderer.invoke('document-viewer/open-window', url, format, options);
};

export const supportedDocumentViewerFormats = (): string[] => [
  'pdf',
  'markdown',
];
