import { dispatch } from '../../../store';
import { WEBVIEW_SERVER_VERSION_UPDATED } from '../../../ui/actions';
import { getServerUrl } from '../urls';
import { setVersion } from '../version';

jest.mock('../../../store', () => ({
  dispatch: jest.fn(),
}));

jest.mock('../urls', () => ({
  getServerUrl: jest.fn(),
}));

const dispatchMock = dispatch as jest.MockedFunction<typeof dispatch>;
const getServerUrlMock = getServerUrl as jest.MockedFunction<typeof getServerUrl>;

describe('servers/preload/version', () => {
  beforeEach(() => {
    dispatchMock.mockClear();
    getServerUrlMock.mockReturnValue('https://server.example');
  });

  it('dispatches version updates with the configured server URL', () => {
    setVersion('1.2.3');

    expect(dispatchMock).toHaveBeenCalledWith({
      type: WEBVIEW_SERVER_VERSION_UPDATED,
      payload: {
        url: 'https://server.example',
        version: '1.2.3',
      },
    });
  });
});

