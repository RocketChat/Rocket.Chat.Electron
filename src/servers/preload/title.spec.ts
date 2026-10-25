import { dispatch } from '../../store';
import { WEBVIEW_TITLE_CHANGED } from '../../ui/actions';
import { setTitle } from './title';
import { getServerUrl } from './urls';

jest.mock('../../store', () => ({
  dispatch: jest.fn(),
}));

jest.mock('./urls', () => ({
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

  it('adds the workspace URL to the default title', () => {
    getServerUrlMock.mockReturnValue('https://chat.example.com/');

    setTitle('Rocket.Chat');

    expect(dispatchMock).toHaveBeenCalledWith({
      type: WEBVIEW_TITLE_CHANGED,
      payload: {
        url: 'https://chat.example.com/',
        title: 'Rocket.Chat - https://chat.example.com/',
      },
    });
  });

  it('does not show the credentials of the workspace URL in the title', () => {
    const url = 'https://alice:s3cret@chat.example.com/';
    getServerUrlMock.mockReturnValue(url);

    setTitle('Rocket.Chat');

    expect(dispatchMock).toHaveBeenCalledWith({
      type: WEBVIEW_TITLE_CHANGED,
      payload: {
        url,
        title: 'Rocket.Chat - https://chat.example.com/',
      },
    });
  });
});
