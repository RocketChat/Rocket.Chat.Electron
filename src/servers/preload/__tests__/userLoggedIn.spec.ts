/** @jest-environment jsdom */
import { dispatch } from '../../../store';
import { WEBVIEW_USER_LOGGED_IN } from '../../../ui/actions';
import { getServerUrl } from '../urls';
import { setUserLoggedIn } from '../userLoggedIn';
import { clearUserRoles, updateUserRoles } from '../userRoles';

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

const dispatchMock = dispatch as jest.MockedFunction<typeof dispatch>;
const getServerUrlMock = getServerUrl as jest.MockedFunction<
  typeof getServerUrl
>;
const clearUserRolesMock = clearUserRoles as jest.MockedFunction<
  typeof clearUserRoles
>;
const updateUserRolesMock = updateUserRoles as jest.MockedFunction<
  typeof updateUserRoles
>;

describe('servers/preload/userLoggedIn', () => {
  beforeEach(() => {
    dispatchMock.mockClear();
    getServerUrlMock.mockReturnValue('https://server.local');
    clearUserRolesMock.mockClear();
    updateUserRolesMock.mockClear();
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
