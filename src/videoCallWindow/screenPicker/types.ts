export type ScreenPickerType = 'internal' | 'portal';

// DisplayMediaCallback matches Electron's setDisplayMediaRequestHandler callback
// We use 'any' to match the existing code pattern that uses 'as any' casts for flexibility
export type DisplayMediaCallback = (streams: any) => void;

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
   */
  handleDisplayMediaRequest(callback: DisplayMediaCallback): void;

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
