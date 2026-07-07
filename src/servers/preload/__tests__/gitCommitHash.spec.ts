import { dispatch } from '../../../store';
import { WEBVIEW_GIT_COMMIT_HASH_CHECK } from '../../../ui/actions';
import { getServerUrl } from '../urls';
import { setGitCommitHash } from '../gitCommitHash';

jest.mock('../../../store', () => ({
  dispatch: jest.fn(),
}));

jest.mock('../urls', () => ({
  getServerUrl: jest.fn(),
}));

const dispatchMock = dispatch as jest.MockedFunction<typeof dispatch>;
const getServerUrlMock = getServerUrl as jest.MockedFunction<typeof getServerUrl>;

describe('servers/preload/gitCommitHash', () => {
  beforeEach(() => {
    dispatchMock.mockClear();
    getServerUrlMock.mockReturnValue('https://server.example');
  });

  it('dispatches git commit hash updates with the configured server URL', () => {
    setGitCommitHash('abc123');

    expect(dispatchMock).toHaveBeenCalledWith({
      type: WEBVIEW_GIT_COMMIT_HASH_CHECK,
      payload: {
        url: 'https://server.example',
        gitCommitHash: 'abc123',
      },
    });
  });
});

