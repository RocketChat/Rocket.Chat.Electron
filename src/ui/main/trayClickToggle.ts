import type { BrowserWindow } from 'electron';

// On Windows, the mouse-down on the notification area makes the taskbar the
// foreground window, so the root window is already blurred when the tray
// `click` event arrives. A blur this recent was caused by the click itself.
// Other platforms get no such blur, so a recent blur there means the user
// switched to another app.
export const TRAY_CLICK_BLUR_GRACE_MS = 500;

type TrayClickWindowState = {
  visible: boolean;
  minimized: boolean;
  focused: boolean;
  msSinceBlur: number;
  platform: NodeJS.Platform;
};

export const shouldHideOnTrayClick = ({
  visible,
  minimized,
  focused,
  msSinceBlur,
  platform,
}: TrayClickWindowState): boolean =>
  visible &&
  !minimized &&
  (focused ||
    (platform === 'win32' && msSinceBlur <= TRAY_CLICK_BLUR_GRACE_MS));

const lastBlurAt = new WeakMap<BrowserWindow, number>();
const trackedWindows = new WeakSet<BrowserWindow>();

export const trackRootWindowBlur = (browserWindow: BrowserWindow): void => {
  if (trackedWindows.has(browserWindow)) {
    return;
  }
  trackedWindows.add(browserWindow);
  browserWindow.on('blur', () => {
    lastBlurAt.set(browserWindow, Date.now());
  });
};

type TrayClick = {
  // Read before the root window lookup, which waits 300 ms.
  clickedAt: number;
  platform?: NodeJS.Platform;
};

export const toggleRootWindowFromTray = (
  browserWindow: BrowserWindow,
  { clickedAt, platform = process.platform }: TrayClick
): void => {
  const blurredAt = lastBlurAt.get(browserWindow);
  const shouldHide = shouldHideOnTrayClick({
    visible: browserWindow.isVisible(),
    minimized: browserWindow.isMinimized(),
    focused: browserWindow.isFocused(),
    msSinceBlur:
      blurredAt === undefined
        ? Number.POSITIVE_INFINITY
        : clickedAt - blurredAt,
    platform,
  });

  if (shouldHide) {
    browserWindow.hide();
    return;
  }

  if (browserWindow.isMinimized()) {
    browserWindow.restore();
  }
  browserWindow.show();
  browserWindow.focus();
};
