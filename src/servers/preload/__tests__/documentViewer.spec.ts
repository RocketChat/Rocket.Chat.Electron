/** @jest-environment jsdom */
import { ipcRenderer } from 'electron';

import {
  openDocumentViewer,
  supportedDocumentViewerFormats,
} from '../documentViewer';

jest.mock('electron', () => ({
  ipcRenderer: {
    invoke: jest.fn(),
  },
}));

describe('servers/preload/documentViewer', () => {
  it('forwards openDocumentViewer arguments to ipc invoke', () => {
    openDocumentViewer('https://server.local/file', 'pdf', { width: 10 });

    expect(ipcRenderer.invoke).toHaveBeenCalledWith(
      'document-viewer/open-window',
      'https://server.local/file',
      'pdf',
      { width: 10 }
    );
  });

  it('returns the supported formats list', () => {
    expect(supportedDocumentViewerFormats()).toEqual(['pdf', 'markdown']);
  });
});
