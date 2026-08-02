import { BrowserWindow, webContents as electronWebContents } from 'electron';

import { resolveStandaloneOriginWindow } from '../serverViewScreenSharing';

jest.mock('electron', () => ({
  BrowserWindow: {
    fromWebContents: jest.fn(),
  },
  webContents: {
    fromFrame: jest.fn(),
  },
}));

jest.mock('../../ipc/main', () => ({ handle: jest.fn() }));
jest.mock('../../navigation/main', () => ({
  isProtocolAllowed: jest.fn(),
}));
jest.mock('../../ui/main/rootWindow', () => ({
  getRootWindow: jest.fn(),
}));
jest.mock('../../utils/browserLauncher', () => ({
  openExternal: jest.fn(),
}));
jest.mock('../ScreenSharingRequestTracker', () => ({
  ScreenSharingRequestTracker: jest.fn().mockImplementation(() => ({
    createRequest: jest.fn(),
  })),
}));
jest.mock('../desktopCapturerCache', () => ({
  prewarmDesktopCapturerCache: jest.fn(),
}));
jest.mock('../popoutPickerRequest', () => ({
  requestViaPickerWindow: jest.fn(),
}));
jest.mock('../screenRecordingPermission', () => ({
  checkScreenRecordingPermission: jest.fn(),
}));

describe('resolveStandaloneOriginWindow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when frame is missing', () => {
    expect(resolveStandaloneOriginWindow(null)).toBeNull();
    expect(resolveStandaloneOriginWindow(undefined)).toBeNull();
  });

  it('returns null when frame has no webContents', () => {
    (electronWebContents.fromFrame as jest.Mock).mockReturnValue(null);
    expect(resolveStandaloneOriginWindow({} as any)).toBeNull();
  });

  it('returns null for guest webview contents (hostWebContents set)', () => {
    (electronWebContents.fromFrame as jest.Mock).mockReturnValue({
      hostWebContents: {},
    });
    expect(resolveStandaloneOriginWindow({} as any)).toBeNull();
  });

  it('returns BrowserWindow for standalone origin contents', () => {
    const wc = { hostWebContents: undefined };
    const win = { id: 1 };
    (electronWebContents.fromFrame as jest.Mock).mockReturnValue(wc);
    (BrowserWindow.fromWebContents as jest.Mock).mockReturnValue(win);
    expect(resolveStandaloneOriginWindow({} as any)).toBe(win);
    expect(BrowserWindow.fromWebContents).toHaveBeenCalledWith(wc);
  });
});
