import { ipcRenderer } from 'electron';
import { openInBrowser } from '../openInBrowser';

jest.mock('electron', () => ({
  ipcRenderer: {
    invoke: jest.fn(),
  },
}));

const invokeMock = ipcRenderer.invoke as jest.MockedFunction<typeof ipcRenderer.invoke>;
const consoleWarnMock = jest.spyOn(console, 'warn').mockImplementation();

describe('servers/preload/openInBrowser', () => {
  beforeEach(() => {
    invokeMock.mockClear();
    consoleWarnMock.mockClear();
  });

  afterAll(() => {
    consoleWarnMock.mockRestore();
  });

  it('opens http and https URLs through browser IPC', () => {
    openInBrowser('https://example.com/path');

    expect(invokeMock).toHaveBeenCalledWith(
      'browser/open-url',
      'https://example.com/path'
    );
    expect(consoleWarnMock).not.toHaveBeenCalled();
  });

  it('warns and ignores unsupported protocols', () => {
    openInBrowser('ftp://example.com/file');

    expect(invokeMock).not.toHaveBeenCalled();
    expect(consoleWarnMock).toHaveBeenCalledWith(
      expect.stringContaining('blocked non-http(s) URL: ftp:')
    );
  });

  it('warns when URL parsing fails', () => {
    openInBrowser('not a valid url');

    expect(invokeMock).not.toHaveBeenCalled();
    expect(consoleWarnMock).toHaveBeenCalledWith(
      '[RocketChatDesktop.openInBrowser] invalid URL:',
      expect.anything()
    );
  });
});
