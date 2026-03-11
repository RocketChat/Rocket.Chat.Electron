import type { DisplayMediaCallback, ScreenPickerProvider } from '../types';

/**
 * Internal picker provider that uses the React UI and desktopCapturer cache.
 * This provider works in both main and renderer processes:
 * - handleDisplayMediaRequest: called from main process, uses ipc.ts state
 * - initialize: called from renderer process, preloads UI and cache
 *
 * Note: This provider needs access to state in ipc.ts. The factory will
 * pass a handler function that encapsulates the internal picker logic.
 */
export class InternalPickerProvider implements ScreenPickerProvider {
  readonly type = 'internal' as const;

  readonly requiresInternalUI = true;

  readonly requiresCacheWarming = true;

  private isInitialized = false;

  private handleRequestFn: ((callback: DisplayMediaCallback) => void) | null =
    null;

  private initializeFn: (() => Promise<void>) | null = null;

  /**
   * Set the handler function from main process (ipc.ts)
   * This encapsulates all the internal picker logic with access to ipc.ts state
   */
  setHandleRequestHandler(
    handler: (callback: DisplayMediaCallback) => void
  ): void {
    this.handleRequestFn = handler;
  }

  /**
   * Set the initialize function from renderer process (video-call-window.ts)
   * This encapsulates the UI preload and cache warming logic
   */
  setInitializeHandler(handler: () => Promise<void>): void {
    this.initializeFn = handler;
  }

  handleDisplayMediaRequest(callback: DisplayMediaCallback): void {
    if (this.handleRequestFn) {
      this.handleRequestFn(callback);
    } else {
      console.error(
        'InternalPickerProvider: handleRequest handler not set. This should be set by ipc.ts'
      );
      callback({ video: false });
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('Screen picker [internal]: initializing cache and UI');

    if (this.initializeFn) {
      await this.initializeFn();
    } else {
      console.warn(
        'InternalPickerProvider: initialize handler not set. Call setInitializeHandler() first.'
      );
    }

    this.isInitialized = true;
  }

  cleanup(): void {
    // Clear caches, reset state
    this.isInitialized = false;
  }
}
