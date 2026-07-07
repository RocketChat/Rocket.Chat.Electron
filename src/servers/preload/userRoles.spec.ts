/**
 * @jest-environment jsdom
 */
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

  it('does not fetch when the server URL is missing', async () => {
    getServerUrlMock.mockReturnValue(undefined as unknown as string);
    global.fetch = jest.fn() as unknown as typeof global.fetch;

    await updateUserRoles();

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('does not dispatch roles when the REST response is not ok', async () => {
    localStorage.setItem('Meteor.loginToken', 'token');
    localStorage.setItem('Meteor.userId', 'user-id');

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
    }) as unknown as typeof global.fetch;

    await updateUserRoles();

    expect(dispatchMock).not.toHaveBeenCalled();
  });

  it('does not dispatch roles when REST response roles are not an array', async () => {
    localStorage.setItem('Meteor.loginToken', 'token');
    localStorage.setItem('Meteor.userId', 'user-id');

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ roles: {} }),
    }) as unknown as typeof global.fetch;

    await updateUserRoles();

    expect(dispatchMock).not.toHaveBeenCalled();
  });

  it('does not dispatch when REST payload cannot be read', async () => {
    localStorage.setItem('Meteor.loginToken', 'token');
    localStorage.setItem('Meteor.userId', 'user-id');

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => null,
    }) as unknown as typeof global.fetch;

    await updateUserRoles();

    expect(dispatchMock).not.toHaveBeenCalled();
  });

  it('keeps authoritative bridge roles when the fallback update runs while roles are available', async () => {
    localStorage.setItem('Meteor.loginToken', 'token');
    localStorage.setItem('Meteor.userId', 'user-id');

    global.fetch = jest.fn().mockImplementation(async () => {
      setUserRoles(['bridge-role']);

      return {
        ok: true,
        json: async () => ({ roles: ['me-role'] }),
      } as { ok: boolean; json: () => Promise<{ roles: unknown }> };
    }) as unknown as typeof global.fetch;

    await updateUserRoles();

    expect(dispatchMock).toHaveBeenCalledTimes(1);
    expect(dispatchMock).toHaveBeenCalledWith({
      type: WEBVIEW_USER_ROLES_CHANGED,
      payload: { url: 'https://rocket.chat', userRoles: ['bridge-role'] },
    });
  });

  it('ignores non-array input from bridge updates', () => {
    setUserRoles('admin');

    expect(dispatchMock).not.toHaveBeenCalled();
  });

  it('swallows fetch errors without dispatching roles', async () => {
    localStorage.setItem('Meteor.loginToken', 'token');
    localStorage.setItem('Meteor.userId', 'user-id');

    global.fetch = jest.fn(async () => {
      throw new Error('network down');
    }) as unknown as typeof global.fetch;

    await expect(updateUserRoles()).resolves.toBeUndefined();

    expect(dispatchMock).not.toHaveBeenCalled();
  });
});
