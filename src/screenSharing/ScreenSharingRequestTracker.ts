import type { Event } from 'electron';
import { desktopCapturer, ipcMain } from 'electron';

import type { DisplayMediaCallback } from './screenPicker/types';

const DEFAULT_TIMEOUT = 60000;

export class ScreenSharingRequestTracker {
  private activeListener:
    | ((event: Event, sourceId: string | null) => void)
    | null = null;

  private activeRequestId: string | null = null;

  private timeout: NodeJS.Timeout | null = null;

  private isPending = false;

  constructor(
    private readonly responseChannel: string,
    private readonly label: string,
    private readonly timeoutMs: number = DEFAULT_TIMEOUT
  ) {}

  cleanup(): void {
    if (this.activeListener) {
      ipcMain.removeListener(this.responseChannel, this.activeListener);
      this.activeListener = null;
    }

    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }

    this.activeRequestId = null;
    this.isPending = false;
  }

  private removeListenerOnly(): void {
    if (this.activeListener) {
      ipcMain.removeListener(this.responseChannel, this.activeListener);
      this.activeListener = null;
    }

    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }

  private markComplete(): void {
    this.activeRequestId = null;
    this.isPending = false;
  }

  get pending(): boolean {
    return this.isPending;
  }

  createRequest(cb: DisplayMediaCallback, sendOpenPicker: () => void): void {
    if (this.isPending) {
      console.warn(`${this.label}: request already pending, ignoring`);
      cb({ video: false } as any);
      return;
    }

    this.cleanup();

    const requestId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    this.activeRequestId = requestId;
    this.isPending = true;

    let callbackInvoked = false;

    const listener = async (_event: Event, sourceId: string | null) => {
      if (this.activeRequestId !== requestId) {
        return;
      }

      if (callbackInvoked) {
        return;
      }
      callbackInvoked = true;

      this.removeListenerOnly();
      this.markComplete();

      if (!sourceId) {
        cb({ video: false } as any);
        return;
      }

      try {
        const sources = await desktopCapturer.getSources({
          types: ['window', 'screen'],
        });

        const selectedSource = sources.find((s) => s.id === sourceId);

        if (!selectedSource) {
          console.warn(
            `${this.label}: selected source no longer available:`,
            sourceId
          );
          cb({ video: false } as any);
          return;
        }

        cb({ video: selectedSource });
      } catch (error) {
        console.error(`${this.label}: error validating source:`, error);
        cb({ video: false } as any);
      }
    };

    this.activeListener = listener;

    this.timeout = setTimeout(() => {
      if (this.activeRequestId !== requestId) {
        return;
      }

      if (callbackInvoked) {
        return;
      }
      callbackInvoked = true;

      console.warn(`${this.label}: request timed out, cleaning up`);
      this.removeListenerOnly();
      this.markComplete();
      cb({ video: false } as any);
    }, this.timeoutMs);

    ipcMain.once(this.responseChannel, listener);
    sendOpenPicker();
  }
}
