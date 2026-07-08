import type { BrowserWindow as BrowserWindowType, WebContents } from 'electron';
import { BrowserWindow, webContents } from 'electron';

import { resolveStandaloneOriginWindow } from '../serverViewScreenSharing';

jest.mock('electron', () => ({
  BrowserWindow: {
    fromWebContents: jest.fn(),
  },
  webContents: {
    fromFrame: jest.fn(),
  },
}));

jest.mock('../../ipc/main', () => ({
  handle: jest.fn(),
}));

jest.mock('../../navigation/main', () => ({
  isProtocolAllowed: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('../../ui/main/rootWindow', () => ({
  getRootWindow: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('../../utils/browserLauncher', () => ({
  openExternal: jest.fn(),
}));

jest.mock('../screenRecordingPermission', () => ({
  checkScreenRecordingPermission: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('../desktopCapturerCache', () => ({
  prewarmDesktopCapturerCache: jest.fn(),
}));

const fromFrameMock = webContents.fromFrame as jest.MockedFunction<
  typeof webContents.fromFrame
>;
const fromWebContentsMock =
  BrowserWindow.fromWebContents as jest.MockedFunction<
    typeof BrowserWindow.fromWebContents
  >;

describe('resolveStandaloneOriginWindow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when frame is null', () => {
    expect(resolveStandaloneOriginWindow(null)).toBeNull();
    expect(fromFrameMock).not.toHaveBeenCalled();
  });

  it('returns null when frame is undefined', () => {
    expect(resolveStandaloneOriginWindow(undefined)).toBeNull();
    expect(fromFrameMock).not.toHaveBeenCalled();
  });

  it('returns null when webContents.fromFrame finds nothing', () => {
    fromFrameMock.mockReturnValue(undefined);

    expect(resolveStandaloneOriginWindow({} as any)).toBeNull();
    expect(fromWebContentsMock).not.toHaveBeenCalled();
  });

  it('returns null when the origin is a webview guest (has hostWebContents)', () => {
    const guestWebContents = {
      hostWebContents: {} as WebContents,
    } as WebContents;
    fromFrameMock.mockReturnValue(guestWebContents);

    expect(resolveStandaloneOriginWindow({} as any)).toBeNull();
    expect(fromWebContentsMock).not.toHaveBeenCalled();
  });

  it('returns the owning BrowserWindow for a standalone window origin', () => {
    const standaloneWebContents = {
      hostWebContents: null,
    } as WebContents;
    const expectedWindow = {} as BrowserWindowType;
    fromFrameMock.mockReturnValue(standaloneWebContents);
    fromWebContentsMock.mockReturnValue(expectedWindow);

    expect(resolveStandaloneOriginWindow({} as any)).toBe(expectedWindow);
    expect(fromWebContentsMock).toHaveBeenCalledWith(standaloneWebContents);
  });
});
