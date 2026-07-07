jest.mock('electron', () => ({
  ipcRenderer: {
    invoke: jest.fn(),
  },
}));

const mockDispatch = jest.fn();
const safeSelect = jest.fn();
const getServerUrlMock = jest.fn(() => 'https://server.local');

jest.mock('../../../store', () => ({
  dispatch: mockDispatch,
  safeSelect,
}));

jest.mock('../urls', () => ({
  setServerUrl: jest.fn(),
  setUrlResolver: jest.fn(),
  getServerUrl: getServerUrlMock,
  getAbsoluteUrl: (relativePath?: string) =>
    `https://cdn.local/${relativePath}`,
}));

const { dispatch: mockedDispatch, safeSelect: mockedSafeSelect } =
  require('../../../store');
const { getServerUrl: mockedGetServerUrl } = require('../urls');
const { reloadServer } = require('../reloadServer');
const { setBadge } = require('../badge');
const { setGitCommitHash } = require('../gitCommitHash');
const { setWorkspaceUID } = require('../uniqueID');
const { setTitle } = require('../title');
const { setUserThemeAppearance } = require('../themeAppearance');
const { getE2ePdfPreviewSizeLimit } = require('../e2ePdfPreviewSizeLimit');
const { openDocumentViewer, supportedDocumentViewerFormats } =
  require('../documentViewer');
const { ipcRenderer: mockIpcRenderer } = require('electron');
const { DEFAULT_E2E_PDF_PREVIEW_SIZE_LIMIT_MB } = require('../../../constants');
const {
  WEBVIEW_FORCE_RELOAD_WITH_CACHE_CLEAR,
  WEBVIEW_UNREAD_CHANGED,
  WEBVIEW_GIT_COMMIT_HASH_CHECK,
  WEBVIEW_SERVER_UNIQUE_ID_UPDATED,
  WEBVIEW_TITLE_CHANGED,
} = require('../../../ui/actions');

describe('servers/preload window helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('dispatches cache clear reload actions', () => {
    mockedGetServerUrl.mockReturnValue('https://server.local');
    reloadServer();

    expect(mockedDispatch).toHaveBeenCalledWith({
      type: WEBVIEW_FORCE_RELOAD_WITH_CACHE_CLEAR,
      payload: 'https://server.local',
    });
  });

  it('dispatches badge updates', () => {
    mockedGetServerUrl.mockReturnValue('https://server.local');
    setBadge(5);

    expect(mockedDispatch).toHaveBeenCalledWith({
      type: WEBVIEW_UNREAD_CHANGED,
      payload: { url: 'https://server.local', badge: 5 },
    });
  });

  it('dispatches git commit hash updates', () => {
    mockedGetServerUrl.mockReturnValue('https://server.local');
    setGitCommitHash('abc123');

    expect(mockedDispatch).toHaveBeenCalledWith({
      type: WEBVIEW_GIT_COMMIT_HASH_CHECK,
      payload: {
        url: 'https://server.local',
        gitCommitHash: 'abc123',
      },
    });
  });

  it('dispatches workspace UID updates', () => {
    mockedGetServerUrl.mockReturnValue('https://server.local');
    setWorkspaceUID('workspace-1');

    expect(mockedDispatch).toHaveBeenCalledWith({
      type: WEBVIEW_SERVER_UNIQUE_ID_UPDATED,
      payload: { url: 'https://server.local', uniqueID: 'workspace-1' },
    });
  });

  it('normalizes Rocket.Chat title for non-default host', () => {
    mockedGetServerUrl.mockReturnValue('https://example.com');
    setTitle('Rocket.Chat');

    expect(mockedDispatch).toHaveBeenCalledWith({
      type: WEBVIEW_TITLE_CHANGED,
      payload: { url: 'https://example.com', title: 'Rocket.Chat - https://example.com' },
    });
  });

  it('keeps Rocket.Chat title for the default host', () => {
    mockedGetServerUrl.mockReturnValue('https://open.rocket.chat');
    setTitle('Rocket.Chat');

    expect(mockedDispatch).toHaveBeenCalledWith({
      type: WEBVIEW_TITLE_CHANGED,
      payload: { url: 'https://open.rocket.chat', title: 'Rocket.Chat' },
    });
  });

  it('ignores non-string titles', () => {
    setTitle((123 as unknown) as string);
    expect(mockedDispatch).not.toHaveBeenCalled();
  });

  it('opens document viewer windows', () => {
    openDocumentViewer('https://example.com/file.pdf', 'pdf', { page: 1 });
    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
      'document-viewer/open-window',
      'https://example.com/file.pdf',
      'pdf',
      { page: 1 }
    );
  });

  it('returns supported document viewer formats', () => {
    expect(supportedDocumentViewerFormats()).toEqual(['pdf', 'markdown']);
  });

  it('reads preview size from state with default fallback', () => {
    mockedSafeSelect.mockReturnValue(undefined);
    expect(getE2ePdfPreviewSizeLimit()).toBe(
      DEFAULT_E2E_PDF_PREVIEW_SIZE_LIMIT_MB
    );

    mockedSafeSelect.mockReturnValue(100);
    expect(getE2ePdfPreviewSizeLimit()).toBe(100);
  });

  it('handles theme appearance updates with no-op API shape', () => {
    expect(() => setUserThemeAppearance('system' as unknown as string)).not.toThrow();
  });
});
