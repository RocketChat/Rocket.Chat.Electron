export const SCREEN_CAPTURE_SETTINGS_URL_MAC =
  'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture';
export const SCREEN_CAPTURE_SETTINGS_URL_WINDOWS =
  'ms-settings:privacy-screencapture';

export const isScreenCaptureSettingsUrl = (url: string): boolean =>
  url === SCREEN_CAPTURE_SETTINGS_URL_MAC ||
  url === SCREEN_CAPTURE_SETTINGS_URL_WINDOWS;
