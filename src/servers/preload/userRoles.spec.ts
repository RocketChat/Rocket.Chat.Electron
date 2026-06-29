import { dispatch } from '../../store';
import { WEBVIEW_USER_ROLES_CHANGED } from '../../ui/actions';
import { getServerUrl } from './urls';
import { clearUserRoles, setUserRoles, updateUserRoles } from './userRoles';

jest.mock('../../store', () => ({
  dispatch: jest.fn(),
}));
jest.mock('./urls', () => ({
  getServerUrl: jest.fn(() => 'https://rocket.chat'),
}));

const dispatchMock = dispatch as jest.MockedFunction<typeof dispatch>;
const getServerUrlMock = getServerUrl as jest.MockedFunction<
  typeof getServerUrl
>;

describe('servers/preload/userRoles', () => {
  const originalFetch = global.fetch;

  const mockMeResponse = (roles: unknown): void => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ roles }),
    }) as unknown as typeof global.fetch;
  };

  beforeEach(() => {
    dispatchMock.mockClear();
    getServerUrlMock.mockReturnValue('https://rocket.chat');
    localStorage.setItem('Meteor.loginToken', 'token');
    localStorage.setItem('Meteor.userId', 'user-id');
    // Reset the module-level bridge flag between tests.
    clearUserRoles();
    dispatchMock.mockClear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    localStorage.clear();
  });

  it('dispatches roles pushed through the bridge', () => {
    setUserRoles(['admin', 'user']);

    expect(dispatchMock).toHaveBeenCalledWith({
      type: WEBVIEW_USER_ROLES_CHANGED,
      payload: { url: 'https://rocket.chat', userRoles: ['admin', 'user'] },
    });
  });

  it('ignores non-string entries pushed through the bridge', () => {
    setUserRoles(['admin', 42, null]);

    expect(dispatchMock).toHaveBeenCalledWith({
      type: WEBVIEW_USER_ROLES_CHANGED,
      payload: { url: 'https://rocket.chat', userRoles: ['admin'] },
    });
  });

  it('falls back to fetching /api/v1/me when the bridge has not provided roles', async () => {
    mockMeResponse(['admin']);

    await updateUserRoles();

    expect(global.fetch).toHaveBeenCalledWith(
      'https://rocket.chat/api/v1/me',
      expect.objectContaining({
        headers: { 'X-Auth-Token': 'token', 'X-User-Id': 'user-id' },
      })
    );
    expect(dispatchMock).toHaveBeenCalledWith({
      type: WEBVIEW_USER_ROLES_CHANGED,
      payload: { url: 'https://rocket.chat', userRoles: ['admin'] },
    });
  });

  it('skips the fetch fallback once the bridge has provided roles', async () => {
    setUserRoles(['admin']);
    dispatchMock.mockClear();
    global.fetch = jest.fn() as unknown as typeof global.fetch;

    await updateUserRoles();

    expect(global.fetch).not.toHaveBeenCalled();
    expect(dispatchMock).not.toHaveBeenCalled();
  });

  it('does not fetch when the session token is missing', async () => {
    localStorage.removeItem('Meteor.loginToken');
    global.fetch = jest.fn() as unknown as typeof global.fetch;

    await updateUserRoles();

    expect(global.fetch).not.toHaveBeenCalled();
  });
});
