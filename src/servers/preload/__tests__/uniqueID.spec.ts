/** @jest-environment jsdom */
import { dispatch } from '../../../store';
import { WEBVIEW_SERVER_UNIQUE_ID_UPDATED } from '../../../ui/actions';
import { setWorkspaceUID } from '../uniqueID';
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

describe('servers/preload/uniqueID', () => {
  beforeEach(() => {
    dispatchMock.mockClear();
    getServerUrlMock.mockReturnValue('https://server.local');
  });

  it('dispatches unique id updates', () => {
    setWorkspaceUID('abc-123');

    expect(dispatchMock).toHaveBeenCalledWith({
      type: WEBVIEW_SERVER_UNIQUE_ID_UPDATED,
      payload: {
        url: 'https://server.local',
        uniqueID: 'abc-123',
      },
    });
  });
});
