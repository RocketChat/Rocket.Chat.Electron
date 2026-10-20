/** @jest-environment jsdom */
import { WEBVIEW_USER_LOGGED_IN } from '../../../ui/actions';

jest.mock('../../../store', () => ({
  dispatch: jest.fn(),
}));

jest.mock('../urls', () => ({
  getServerUrl: jest.fn(() => 'https://server.local'),
}));

jest.mock('../userRoles', () => ({
  clearUserRoles: jest.fn(),
  updateUserRoles: jest.fn(),
}));

describe('servers/preload/userLoggedIn', () => {
  // The module keeps the last state, so each test loads a fresh copy and
  // does not depend on the order of the tests.
  let setUserLoggedIn: (userLoggedIn: boolean) => void;
  let dispatchMock: jest.Mock;
  let clearUserRoles: jest.Mock;
  let updateUserRoles: jest.Mock;

  beforeEach(async () => {
    jest.resetModules();
    ({ setUserLoggedIn } = await import('../userLoggedIn'));
    ({ dispatch: dispatchMock } = (await import(
      '../../../store'
    )) as unknown as {
      dispatch: jest.Mock;
    });
    ({ clearUserRoles, updateUserRoles } = (await import(
      '../userRoles'
    )) as unknown as { clearUserRoles: jest.Mock; updateUserRoles: jest.Mock });
  });

  it('dispatches logged-in state and refreshes roles for logged-in users', () => {
    setUserLoggedIn(true);

    expect(dispatchMock).toHaveBeenCalledWith({
      type: WEBVIEW_USER_LOGGED_IN,
      payload: {
        url: 'https://server.local',
        userLoggedIn: true,
      },
    });
    expect(updateUserRoles).toHaveBeenCalledTimes(1);
    expect(clearUserRoles).not.toHaveBeenCalled();
  });

  it('ignores a repeat of the same state', () => {
    setUserLoggedIn(true);
    dispatchMock.mockClear();
    updateUserRoles.mockClear();

    setUserLoggedIn(true);

    expect(dispatchMock).not.toHaveBeenCalled();
    expect(updateUserRoles).not.toHaveBeenCalled();
  });

  it('dispatches logged-out state and clears roles', () => {
    setUserLoggedIn(false);

    expect(dispatchMock).toHaveBeenCalledWith({
      type: WEBVIEW_USER_LOGGED_IN,
      payload: {
        url: 'https://server.local',
        userLoggedIn: false,
      },
    });
    expect(clearUserRoles).toHaveBeenCalledTimes(1);
    expect(updateUserRoles).not.toHaveBeenCalled();
  });
});
