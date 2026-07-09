import { JITSI_SERVER_CAPTURE_SCREEN_PERMISSION_UPDATED } from './actions';
import { isJitsiServerAllowed } from './main';

jest.mock('../store', () => ({
  dispatch: jest.fn(),
  select: jest.fn(),
}));

jest.mock('../ui/main/dialogs', () => ({
  askForJitsiCaptureScreenPermission: jest.fn(),
}));

const { dispatch: mockDispatch, select: mockSelect } = jest.requireMock(
  '../store'
) as { dispatch: jest.Mock; select: jest.Mock };
const {
  askForJitsiCaptureScreenPermission: mockAskForJitsiCaptureScreenPermission,
} = jest.requireMock('../ui/main/dialogs') as {
  askForJitsiCaptureScreenPermission: jest.Mock;
};

describe('jitsi/main', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelect.mockImplementation((selector: any) =>
      selector({
        allowedJitsiServers: { 'jitsi.example': true },
      })
    );
  });

  it('uses persisted allowlist when available', async () => {
    const result = await isJitsiServerAllowed('https://jitsi.example/path?x=1');

    expect(result).toEqual({
      allowed: true,
      dontAskAgain: true,
    });
    expect(mockAskForJitsiCaptureScreenPermission).not.toHaveBeenCalled();
  });

  it('asks for permission when not persisted and returns response', async () => {
    mockAskForJitsiCaptureScreenPermission.mockResolvedValue({
      allowed: false,
      dontAskAgain: true,
    });

    mockSelect.mockImplementation((selector: any) =>
      selector({
        allowedJitsiServers: {},
      })
    );

    const result = await isJitsiServerAllowed('https://new.example');

    expect(mockAskForJitsiCaptureScreenPermission).toHaveBeenCalledWith(
      expect.any(URL)
    );
    expect(mockDispatch).toHaveBeenCalledWith({
      type: JITSI_SERVER_CAPTURE_SCREEN_PERMISSION_UPDATED,
      payload: {
        jitsiServer: 'new.example',
        allowed: false,
      },
    });
    expect(result).toEqual({ allowed: false, dontAskAgain: true });
  });

  it('does not dispatch when user does not opt to remember', async () => {
    mockAskForJitsiCaptureScreenPermission.mockResolvedValue({
      allowed: true,
      dontAskAgain: false,
    });

    mockSelect.mockImplementation((selector: any) =>
      selector({
        allowedJitsiServers: {},
      })
    );

    const result = await isJitsiServerAllowed('https://rememberless.example');

    expect(mockDispatch).not.toHaveBeenCalled();
    expect(result).toEqual({ allowed: true, dontAskAgain: false });
  });
});
