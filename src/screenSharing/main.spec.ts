import {
  WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED,
  WEBVIEW_SCREEN_SHARING_SOURCE_RESPONDED,
} from '../ui/actions';
import { SCREEN_SHARING_DIALOG_DISMISSED as DIALOG_DISMISSED } from './actions';
import { setupScreenSharing } from './main';

jest.mock('../store', () => ({
  dispatch: jest.fn(),
  listen: jest.fn(),
}));

jest.mock('../store/fsa', () => ({
  hasMeta: jest.fn((action: { meta?: { id?: string } }) =>
    Boolean(action?.meta?.id)
  ),
  isResponseTo: jest.fn(
    (_id: string, _responses: unknown[]) => (_action: { type: string }) =>
      _action.type !== 'OTHER'
  ),
}));

const { dispatch: mockDispatch, listen: mockListen } = jest.requireMock(
  '../store'
) as { dispatch: jest.Mock; listen: jest.Mock };

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
    const [, requestListener] = mockListen.mock.calls[0] as [string, any];

    requestListener({
      type: WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED,
      meta: { id: 'request-1' },
    });

    const responseListener = mockListen.mock.calls[1][1] as (
      action:
        | { type: string; payload: string; meta: { response: boolean } }
        | { type: string }
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
    const [, requestListener] = mockListen.mock.calls[0] as [string, any];
    requestListener({
      type: WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED,
      meta: { id: 'dismiss-1' },
    });

    const responseListener = mockListen.mock.calls[1][1] as (action: {
      type: string;
      payload?: unknown;
      meta?: { response: boolean };
    }) => void;
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
