import { dispatch } from '../../../store';
import { WEBVIEW_FORCE_RELOAD_WITH_CACHE_CLEAR } from '../../../ui/actions';
import { reloadServer } from '../reloadServer';
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

describe('servers/preload/reloadServer', () => {
  beforeEach(() => {
    dispatchMock.mockClear();
    getServerUrlMock.mockReturnValue('https://server.example');
  });

  it('dispatches a reload action with the configured server URL', () => {
    reloadServer();

    expect(dispatchMock).toHaveBeenCalledWith({
      type: WEBVIEW_FORCE_RELOAD_WITH_CACHE_CLEAR,
      payload: 'https://server.example',
    });
  });
});
