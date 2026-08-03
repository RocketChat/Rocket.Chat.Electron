import { screen } from 'electron';

import {
  applyRootWindowState,
  isInsideSomeScreen,
  normalizeNumber,
} from '../rootWindow';

jest.mock('electron', () => ({
  app: {
    quit: jest.fn(),
    addListener: jest.fn(),
    name: 'Test',
  },
  BrowserWindow: jest.fn(),
  nativeImage: {
    createEmpty: jest.fn(),
    createFromPath: jest.fn(),
  },
  nativeTheme: {
    shouldUseDarkColors: false,
    on: jest.fn(),
  },
  screen: {
    getPrimaryDisplay: jest.fn(() => ({
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
      workAreaSize: { width: 1920, height: 1080 },
    })),
    getAllDisplays: jest.fn(() => [
      { bounds: { x: 0, y: 0, width: 1920, height: 1080 } },
      { bounds: { x: 1920, y: 0, width: 1920, height: 1080 } },
    ]),
  },
}));

const select = jest.fn();
jest.mock('../../../store', () => ({
  select: (...args: unknown[]) => select(...args),
  watch: jest.fn(() => jest.fn()),
  listen: jest.fn(() => jest.fn()),
  dispatchLocal: jest.fn(),
  dispatch: jest.fn(),
}));

jest.mock('../../../app/main/dev', () => ({
  setupRootWindowReload: jest.fn(),
}));

jest.mock('../icons', () => ({
  getTrayIconPath: jest.fn(),
  getAppIconPath: jest.fn(),
}));

describe('rootWindow geometry helpers', () => {
  describe('normalizeNumber', () => {
    it('returns finite values unchanged', () => {
      expect(normalizeNumber(12)).toBe(12);
      expect(normalizeNumber(-3.5)).toBe(-3.5);
    });

    it('maps undefined, 0 and NaN to 0', () => {
      expect(normalizeNumber(undefined)).toBe(0);
      expect(normalizeNumber(0)).toBe(0);
      expect(normalizeNumber(Number.NaN)).toBe(0);
    });
  });

  describe('isInsideSomeScreen', () => {
    it('returns true when the rectangle overlaps primary display', () => {
      expect(
        isInsideSomeScreen({ x: 100, y: 100, width: 800, height: 600 })
      ).toBe(true);
    });

    it('returns true when the rectangle sits on a secondary display', () => {
      expect(
        isInsideSomeScreen({ x: 2000, y: 50, width: 400, height: 300 })
      ).toBe(true);
    });

    it('returns false when the rectangle is completely off all displays', () => {
      expect(
        isInsideSomeScreen({ x: -5000, y: -5000, width: 100, height: 100 })
      ).toBe(false);
    });
  });

  describe('applyRootWindowState', () => {
    const browserWindow = {
      setBounds: jest.fn(),
      setMinimumSize: jest.fn(),
      maximize: jest.fn(),
      unmaximize: jest.fn(),
      minimize: jest.fn(),
      restore: jest.fn(),
      setFullScreen: jest.fn(),
      show: jest.fn(),
      showInactive: jest.fn(),
      // applyRootWindowState early-returns when already visible
      isVisible: jest.fn(() => false),
      isMinimized: jest.fn(() => false),
      isMaximized: jest.fn(() => false),
      isFullScreen: jest.fn(() => false),
      focus: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
      browserWindow.isVisible.mockReturnValue(false);
    });

    it('centers on primary display when saved bounds are off-screen', () => {
      select.mockImplementation((selector: any) =>
        selector({
          rootWindowState: {
            focused: true,
            visible: false,
            maximized: false,
            minimized: false,
            fullscreen: false,
            normal: true,
            bounds: { x: -9999, y: -9999, width: 800, height: 600 },
          },
          isTrayIconEnabled: true,
        })
      );

      applyRootWindowState(browserWindow as any);
      expect(screen.getPrimaryDisplay).toHaveBeenCalled();
      expect(browserWindow.setBounds).toHaveBeenCalled();
      const bounds = browserWindow.setBounds.mock.calls[0][0];
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.y).toBeGreaterThanOrEqual(0);
    });

    it('skips layout when window is already visible', () => {
      browserWindow.isVisible.mockReturnValue(true);
      select.mockImplementation((selector: any) =>
        selector({
          rootWindowState: {
            focused: true,
            visible: true,
            maximized: false,
            minimized: false,
            fullscreen: false,
            normal: true,
            bounds: { x: 10, y: 10, width: 800, height: 600 },
          },
          isTrayIconEnabled: true,
        })
      );
      applyRootWindowState(browserWindow as any);
      expect(browserWindow.setBounds).not.toHaveBeenCalled();
    });
  });
});
