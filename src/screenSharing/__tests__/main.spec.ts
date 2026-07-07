export {};

const mockDispatch = jest.fn();
const mockListen = jest.fn();

const mockHasMeta = jest.fn((action: { meta?: { id?: string } }) =>
  Boolean(action?.meta?.id)
);
const mockIsResponseTo = jest.fn(
  (_id: string, _responses: unknown[]) => (_action: { type: string }) =>
    _action.type !== 'OTHER'
);

jest.mock('../../store', () => ({
  dispatch: (...args: unknown[]) => mockDispatch(...args),
  listen: (...args: unknown[]) => mockListen(...args),
}));

jest.mock('../../store/fsa', () => ({
  hasMeta: mockHasMeta,
  isResponseTo: mockIsResponseTo,
}));

const { setupScreenSharing } = require('../main');
const { WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED } = require('../../ui/actions');
const { WEBVIEW_SCREEN_SHARING_SOURCE_RESPONDED } = require('../../ui/actions');
const { SCREEN_SHARING_DIALOG_DISMISSED: DIALOG_DISMISSED } = require('../actions');

describe('screenSharing/main', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListen.mockImplementation(() => jest.fn());
  });

  it('registers listener for source request action', () => {
    setupScreenSharing();
    expect(mockListen).toHaveBeenCalledWith(
      WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED,
      expect.any(Function)
    );
  });

  it('dispatches selected source id once response is received', async () => {
    setupScreenSharing();
    const [_, requestListener] = mockListen.mock.calls[0] as [string, any];

    requestListener({
      type: WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED,
      meta: { id: 'request-1' },
    });

    const responseListener = mockListen.mock.calls[1][1] as (
      action: { type: string; payload: string; meta: { response: boolean } } | { type: string }
    ) => void;
    responseListener({
      type: WEBVIEW_SCREEN_SHARING_SOURCE_RESPONDED,
      payload: 'source-1',
      meta: { response: true },
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: WEBVIEW_SCREEN_SHARING_SOURCE_RESPONDED,
      payload: 'source-1',
      meta: {
        response: true,
        id: 'request-1',
      },
    });
  });

  it('dispatches null source id on dialog dismiss', () => {
    setupScreenSharing();
    const [_, requestListener] = mockListen.mock.calls[0] as [string, any];
    requestListener({
      type: WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED,
      meta: { id: 'dismiss-1' },
    });

    const responseListener = mockListen.mock.calls[1][1] as (
      action: { type: string; payload?: unknown; meta?: { response: boolean } }
    ) => void;
    responseListener({
      type: DIALOG_DISMISSED,
      payload: null,
      meta: { response: true },
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: WEBVIEW_SCREEN_SHARING_SOURCE_RESPONDED,
      payload: null,
      meta: {
        response: true,
        id: 'dismiss-1',
      },
    });
  });
});
