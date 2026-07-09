/** @jest-environment jsdom */
import { dispatch } from '../../../store';
import { WEBVIEW_UNREAD_CHANGED } from '../../../ui/actions';
import { setBadge } from '../badge';
import { getServerUrl } from '../urls';

jest.mock('../../../store', () => ({
  dispatch: jest.fn(),
}));

jest.mock('../urls', () => ({
  getServerUrl: jest.fn(() => 'https://server.local'),
}));

const dispatchMock = dispatch as jest.MockedFunction<typeof dispatch>;
const getServerUrlMock = getServerUrl as jest.MockedFunction<
  typeof getServerUrl
>;

describe('servers/preload/badge', () => {
  beforeEach(() => {
    dispatchMock.mockClear();
    getServerUrlMock.mockReturnValue('https://server.local');
  });

  it('dispatches unread changed payload', () => {
    setBadge(12);

    expect(dispatchMock).toHaveBeenCalledWith({
      type: WEBVIEW_UNREAD_CHANGED,
      payload: {
        url: 'https://server.local',
        badge: 12,
      },
    });
  });
});
