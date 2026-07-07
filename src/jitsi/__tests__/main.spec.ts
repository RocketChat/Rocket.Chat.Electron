export {};

const mockDispatch = jest.fn();
const mockSelect = jest.fn((selector: (state: any) => unknown) =>
  selector({
    allowedJitsiServers: { 'jitsi.example': true },
  })
);

jest.mock('../../store', () => ({
  dispatch: (...args: unknown[]) => mockDispatch(...args),
  select: mockSelect as unknown as (...args: unknown[]) => unknown,
}));

const askForJitsiCaptureScreenPermission = jest.fn();
jest.mock('../../ui/main/dialogs', () => ({
  askForJitsiCaptureScreenPermission: (...args: unknown[]) =>
    askForJitsiCaptureScreenPermission(...args),
}));

const { isJitsiServerAllowed } = require('../main');
const { JITSI_SERVER_CAPTURE_SCREEN_PERMISSION_UPDATED } = require('../actions');

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
    expect(askForJitsiCaptureScreenPermission).not.toHaveBeenCalled();
  });

  it('asks for permission when not persisted and returns response', async () => {
    askForJitsiCaptureScreenPermission.mockResolvedValue({
      allowed: false,
      dontAskAgain: true,
    });

    mockSelect.mockImplementation((selector: any) =>
      selector({
        allowedJitsiServers: {},
      })
    );

    const result = await isJitsiServerAllowed('https://new.example');

    expect(askForJitsiCaptureScreenPermission).toHaveBeenCalledWith(
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
    askForJitsiCaptureScreenPermission.mockResolvedValue({
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
