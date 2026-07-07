import { dispatch } from '../../../store';
import { WEBVIEW_TITLE_CHANGED } from '../../../ui/actions';
import { setTitle } from '../title';
import { getServerUrl } from '../urls';

jest.mock('../../../store', () => ({
  dispatch: jest.fn(),
}));

jest.mock('../urls', () => ({
  getServerUrl: jest.fn(),
}));

const dispatchMock = dispatch as jest.MockedFunction<typeof dispatch>;
const getServerUrlMock = getServerUrl as jest.MockedFunction<
  typeof getServerUrl
>;

describe('servers/preload/title', () => {
  beforeEach(() => {
    dispatchMock.mockClear();
  });

  it('appends the server URL when title is Rocket.Chat and server is not open.rocket.chat', () => {
    getServerUrlMock.mockReturnValue('https://example.rocket');

    setTitle('Rocket.Chat');

    expect(dispatchMock).toHaveBeenCalledWith({
      type: WEBVIEW_TITLE_CHANGED,
      payload: {
        url: 'https://example.rocket',
        title: 'Rocket.Chat - https://example.rocket',
      },
    });
  });

  it('keeps Rocket.Chat title unchanged for open.rocket.chat', () => {
    getServerUrlMock.mockReturnValue('https://open.rocket.chat');

    setTitle('Rocket.Chat');

    expect(dispatchMock).toHaveBeenCalledWith({
      type: WEBVIEW_TITLE_CHANGED,
      payload: {
        url: 'https://open.rocket.chat',
        title: 'Rocket.Chat',
      },
    });
  });

  it('passes through non-Rocket.Chat titles', () => {
    getServerUrlMock.mockReturnValue('https://chat.example');

    setTitle('My Workspace');

    expect(dispatchMock).toHaveBeenCalledWith({
      type: WEBVIEW_TITLE_CHANGED,
      payload: {
        url: 'https://chat.example',
        title: 'My Workspace',
      },
    });
  });

  it('ignores non-string titles', () => {
    const dispatchCallCount = dispatchMock.mock.calls.length;

    setTitle(undefined as unknown as string);

    expect(dispatchMock).toHaveBeenCalledTimes(dispatchCallCount);
  });
});
