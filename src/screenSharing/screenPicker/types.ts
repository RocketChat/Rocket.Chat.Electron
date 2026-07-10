import type { BrowserWindow, DesktopCapturerSource } from 'electron';

export type ScreenPickerType = 'internal' | 'portal';

// Matches Electron's setDisplayMediaRequestHandler callback signature. To
// deny, the callback must be invoked with `null` — Electron's own .d.ts types
// the callback as `(streams: Streams) => void` without `null`, but its
// runtime (DisplayMediaDeviceChosen) explicitly accepts and expects it for a
// clean deny. Passing `{}` or `{ video: false }` when video was requested
// throws a TypeError instead.
export type DisplayMediaCallback = (
  streams: { video?: DesktopCapturerSource } | null
) => void;

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface ScreenPickerProvider {
  /** Identifier for this picker type */
  readonly type: ScreenPickerType;

  /** Whether this picker needs the internal React UI mounted */
  readonly requiresInternalUI: boolean;

  /** Whether this picker needs desktopCapturer cache warming */
  readonly requiresCacheWarming: boolean;

  /**
   * Handle a display media request from the webview.
   * Called by setDisplayMediaRequestHandler in main process.
   * `originWindow`, when provided, is the standalone BrowserWindow that
   * originated the request (e.g. a webapp popout), so the picker can be
   * shown there instead of the root window.
   */
  handleDisplayMediaRequest(
    callback: DisplayMediaCallback,
    originWindow?: BrowserWindow
  ): void;

  /**
   * Initialize the picker when video call window is created.
   * Called in renderer process after webview loads.
   */
  initialize(): Promise<void>;

  /**
   * Cleanup when video call window is destroyed.
   */
  cleanup(): void;
}
