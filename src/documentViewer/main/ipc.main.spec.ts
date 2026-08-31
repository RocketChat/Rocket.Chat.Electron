import { session, webContents } from 'electron';

import { SERVER_DOCUMENT_VIEWER_OPEN_URL } from '../../servers/actions';
import { WEBVIEW_PDF_VIEWER_ATTACHED } from '../../ui/actions';
import { startDocumentViewerHandler } from '../ipc';

const handlers = new Map<string, Function>();
const listeners = new Map<string, Function>();
const dispatch = jest.fn();
const select = jest.fn();
const openExternal = jest.fn();

jest.mock('electron', () => ({
  session: {
    fromPartition: jest.fn(),
  },
  webContents: {
    fromId: jest.fn(),
  },
}));

jest.mock('../../ipc/main', () => ({
  handle: (channel: string, fn: Function) => {
    handlers.set(channel, fn);
  },
}));

jest.mock('../../store', () => ({
  dispatch: (...args: unknown[]) => dispatch(...args),
  listen: (type: string, listener: Function) => {
    listeners.set(type, listener);
    return () => listeners.delete(type);
  },
  select: (...args: unknown[]) => select(...args),
}));

jest.mock('../../utils/browserLauncher', () => ({
  openExternal: (...args: unknown[]) => openExternal(...args),
}));

describe('documentViewer/ipc', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    handlers.clear();
    listeners.clear();
    startDocumentViewerHandler();
  });

  describe('document-viewer/open-window', () => {
    it('dispatches open action for allowed http url from known server', async () => {
      select.mockImplementation((selector: any) =>
        selector({
          servers: [{ url: 'https://open.rocket.chat' }],
        })
      );
      const event = {
        getURL: () => 'https://open.rocket.chat/channel/general',
      };
      await handlers.get('document-viewer/open-window')?.(
        event,
        'https://open.rocket.chat/file.pdf',
        'pdf',
        {}
      );
      expect(dispatch).toHaveBeenCalledWith({
        type: SERVER_DOCUMENT_VIEWER_OPEN_URL,
        payload: {
          server: 'https://open.rocket.chat',
          documentUrl: 'https://open.rocket.chat/file.pdf',
          documentFormat: 'pdf',
        },
      });
    });

    it('rejects disallowed protocols', async () => {
      const event = { getURL: () => 'https://open.rocket.chat/' };
      await handlers.get('document-viewer/open-window')?.(
        event,
        'file:///etc/passwd',
        'pdf',
        {}
      );
      expect(dispatch).not.toHaveBeenCalled();
    });

    it('rejects unknown server origins', async () => {
      select.mockImplementation((selector: any) =>
        selector({ servers: [{ url: 'https://other.example' }] })
      );
      const event = { getURL: () => 'https://open.rocket.chat/' };
      await handlers.get('document-viewer/open-window')?.(
        event,
        'https://open.rocket.chat/file.pdf',
        'pdf',
        {}
      );
      expect(dispatch).not.toHaveBeenCalled();
    });
  });

  describe('document-viewer/fetch-content', () => {
    it('fetches text from session partition when origin matches', async () => {
      const fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: async () => '# md',
      });
      (session.fromPartition as jest.Mock).mockReturnValue({ fetch });

      const text = await handlers.get('document-viewer/fetch-content')?.(
        {},
        'https://open.rocket.chat/doc.md',
        'https://open.rocket.chat'
      );
      expect(text).toBe('# md');
      expect(session.fromPartition).toHaveBeenCalledWith(
        'persist:https://open.rocket.chat'
      );
    });

    it('throws on protocol mismatch', async () => {
      await expect(
        handlers.get('document-viewer/fetch-content')?.(
          {},
          'file:///tmp/x',
          'https://open.rocket.chat'
        )
      ).rejects.toThrow('Invalid URL protocol');
    });

    it('throws on origin mismatch', async () => {
      await expect(
        handlers.get('document-viewer/fetch-content')?.(
          {},
          'https://evil.example/doc.md',
          'https://open.rocket.chat'
        )
      ).rejects.toThrow('URL origin does not match server');
    });

    it('throws when fetch response is not ok', async () => {
      (session.fromPartition as jest.Mock).mockReturnValue({
        fetch: jest.fn().mockResolvedValue({ ok: false, status: 404 }),
      });
      await expect(
        handlers.get('document-viewer/fetch-content')?.(
          {},
          'https://open.rocket.chat/missing.md',
          'https://open.rocket.chat'
        )
      ).rejects.toThrow('Failed to fetch: 404');
    });
  });

  describe('WEBVIEW_PDF_VIEWER_ATTACHED', () => {
    it('intercepts navigation on pdf viewer webContents', async () => {
      jest.useFakeTimers();
      try {
        const on = jest.fn();
        const getURL = jest.fn(() => 'https://open.rocket.chat/pdf-viewer');
        (webContents.fromId as jest.Mock).mockReturnValue({ on, getURL });

        await listeners.get(WEBVIEW_PDF_VIEWER_ATTACHED)?.({
          type: WEBVIEW_PDF_VIEWER_ATTACHED,
          payload: { WebContentsId: 42 },
        });

        expect(on).toHaveBeenCalledWith('will-navigate', expect.any(Function));
        const handler = on.mock.calls[0][1];
        const event = { preventDefault: jest.fn() };
        handler(event, 'https://external.example/doc');
        expect(event.preventDefault).toHaveBeenCalled();
        await jest.advanceTimersByTimeAsync(20);
        expect(openExternal).toHaveBeenCalledWith(
          'https://external.example/doc'
        );
      } finally {
        jest.useRealTimers();
      }
    });

    it('skips video call windows', async () => {
      const on = jest.fn();
      (webContents.fromId as jest.Mock).mockReturnValue({
        on,
        getURL: () => 'file:///app/video-call-window.html',
      });
      await listeners.get(WEBVIEW_PDF_VIEWER_ATTACHED)?.({
        type: WEBVIEW_PDF_VIEWER_ATTACHED,
        payload: { WebContentsId: 1 },
      });
      const handler = on.mock.calls[0][1];
      const event = { preventDefault: jest.fn() };
      handler(event, 'https://example.com');
      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });
});
