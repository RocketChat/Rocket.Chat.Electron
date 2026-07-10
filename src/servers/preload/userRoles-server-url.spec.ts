/** @jest-environment jsdom */
import { dispatch } from '../../store';
import { getServerUrl } from './urls';
import { clearUserRoles, updateUserRoles } from './userRoles';

jest.mock('../../store', () => ({
  dispatch: jest.fn(),
}));

jest.mock('./urls', () => ({
  getServerUrl: jest.fn(),
  setServerUrl: jest.fn(),
  setUrlResolver: jest.fn(),
  getAbsoluteUrl: jest.fn(),
}));

const dispatchMock = dispatch as jest.MockedFunction<typeof dispatch>;
const getServerUrlMock = getServerUrl as jest.MockedFunction<
  typeof getServerUrl
>;

describe('servers/preload/userRoles (missing server URL)', () => {
  const originalFetch = global.fetch;
  let serverUrl: string | undefined;

  beforeEach(() => {
    dispatchMock.mockClear();
    getServerUrlMock.mockClear();
    localStorage.setItem('Meteor.loginToken', 'token');
    localStorage.setItem('Meteor.userId', 'user-id');
    serverUrl = undefined;
    getServerUrlMock.mockImplementation(() => serverUrl as unknown as string);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    localStorage.clear();
  });

  it('does not fetch roles when server URL is missing', async () => {
    const mockedFetch = jest.fn() as unknown as typeof global.fetch;
    global.fetch = mockedFetch;
    serverUrl = undefined;
    clearUserRoles();

    await updateUserRoles();

    expect(mockedFetch).not.toHaveBeenCalled();
    expect(dispatchMock).toHaveBeenCalledTimes(1);
    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          url: undefined,
          userRoles: undefined,
        }),
      })
    );
  });

  it('does not fetch roles when server URL is an empty string', async () => {
    const mockedFetch = jest.fn() as unknown as typeof global.fetch;
    serverUrl = '';
    global.fetch = mockedFetch;
    clearUserRoles();

    await updateUserRoles();

    expect(mockedFetch).not.toHaveBeenCalled();
    expect(dispatchMock).toHaveBeenCalledTimes(1);
    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          url: '',
          userRoles: undefined,
        }),
      })
    );
  });
});
