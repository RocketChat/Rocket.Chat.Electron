import type { BrowserWindow } from 'electron';

import {
  shouldHideOnTrayClick,
  toggleRootWindowFromTray,
  trackRootWindowBlur,
  TRAY_CLICK_BLUR_GRACE_MS,
} from './trayClickToggle';

type FakeWindowState = {
  visible: boolean;
  minimized: boolean;
  focused: boolean;
};

const createFakeWindow = (state: FakeWindowState) => {
  const listeners = new Map<string, () => void>();
  const window = {
    isVisible: () => state.visible,
    isMinimized: () => state.minimized,
    isFocused: () => state.focused,
    hide: jest.fn(),
    show: jest.fn(),
    focus: jest.fn(),
    restore: jest.fn(),
    on: jest.fn((event: string, listener: () => void) => {
      listeners.set(event, listener);
    }),
    emit: (event: string) => listeners.get(event)?.(),
  };
  return window;
};

const asBrowserWindow = (window: ReturnType<typeof createFakeWindow>) =>
  window as unknown as BrowserWindow;

describe('shouldHideOnTrayClick', () => {
  it('shows a visible window that is covered by another app', () => {
    expect(
      shouldHideOnTrayClick({
        visible: true,
        minimized: false,
        focused: false,
        msSinceBlur: Number.POSITIVE_INFINITY,
      })
    ).toBe(false);
  });

  it('hides a visible window that has focus', () => {
    expect(
      shouldHideOnTrayClick({
        visible: true,
        minimized: false,
        focused: true,
        msSinceBlur: Number.POSITIVE_INFINITY,
      })
    ).toBe(true);
  });

  it('hides a window that lost focus to the tray click itself', () => {
    expect(
      shouldHideOnTrayClick({
        visible: true,
        minimized: false,
        focused: false,
        msSinceBlur: TRAY_CLICK_BLUR_GRACE_MS - 1,
      })
    ).toBe(true);
  });

  it('shows a minimized window', () => {
    expect(
      shouldHideOnTrayClick({
        visible: true,
        minimized: true,
        focused: false,
        msSinceBlur: Number.POSITIVE_INFINITY,
      })
    ).toBe(false);
  });

  it('shows a hidden window', () => {
    expect(
      shouldHideOnTrayClick({
        visible: false,
        minimized: false,
        focused: false,
        msSinceBlur: 0,
      })
    ).toBe(false);
  });
});

describe('toggleRootWindowFromTray', () => {
  let now = 1_000_000;

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockImplementation(() => now);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows and focuses a covered window instead of hiding it', () => {
    const window = createFakeWindow({
      visible: true,
      minimized: false,
      focused: false,
    });

    toggleRootWindowFromTray(asBrowserWindow(window));

    expect(window.hide).not.toHaveBeenCalled();
    expect(window.show).toHaveBeenCalled();
    expect(window.focus).toHaveBeenCalled();
  });

  it('hides the window when the tray click blurred it just before', () => {
    const state = { visible: true, minimized: false, focused: true };
    const window = createFakeWindow(state);
    trackRootWindowBlur(asBrowserWindow(window));

    state.focused = false;
    window.emit('blur');
    now += 100;

    toggleRootWindowFromTray(asBrowserWindow(window));

    expect(window.hide).toHaveBeenCalled();
    expect(window.show).not.toHaveBeenCalled();
  });

  it('shows the window when it lost focus long before the click', () => {
    const state = { visible: true, minimized: false, focused: true };
    const window = createFakeWindow(state);
    trackRootWindowBlur(asBrowserWindow(window));

    state.focused = false;
    window.emit('blur');
    now += 60_000;

    toggleRootWindowFromTray(asBrowserWindow(window));

    expect(window.hide).not.toHaveBeenCalled();
    expect(window.focus).toHaveBeenCalled();
  });

  it('restores a minimized window', () => {
    const window = createFakeWindow({
      visible: true,
      minimized: true,
      focused: false,
    });

    toggleRootWindowFromTray(asBrowserWindow(window));

    expect(window.restore).toHaveBeenCalled();
    expect(window.show).toHaveBeenCalled();
  });

  it('attaches the blur listener only once per window', () => {
    const window = createFakeWindow({
      visible: true,
      minimized: false,
      focused: true,
    });

    trackRootWindowBlur(asBrowserWindow(window));
    trackRootWindowBlur(asBrowserWindow(window));

    expect(window.on).toHaveBeenCalledTimes(1);
  });
});
