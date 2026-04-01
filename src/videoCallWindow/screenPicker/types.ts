import type { DisplayMediaCallback } from '../types';

export type ScreenPickerType = 'internal' | 'portal';

// Re-export DisplayMediaCallback from parent types for convenience
export type { DisplayMediaCallback } from '../types';

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
