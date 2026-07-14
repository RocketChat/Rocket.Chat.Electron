import type { Event } from 'electron';
import { desktopCapturer, ipcMain } from 'electron';

import { getCachedSources } from './desktopCapturerCache';
import type { DisplayMediaCallback } from './screenPicker/types';

const DEFAULT_TIMEOUT = 60000;

type CreateRequestOptions = {
  isStillValid?: () => boolean;
  onDone?: () => void;
};

type ScreenSharingRequestHandle = {
  cancel: () => void;
};

type QueueEntry = {
  requestId: string;
  cb: DisplayMediaCallback;
  sendOpenPicker: () => void;
  options?: CreateRequestOptions;
  settled: boolean;
};

export class ScreenSharingRequestTracker {
  private activeListener:
    | ((event: Event, sourceId: string | null) => void)
    | null = null;

  private activeRequestId: string | null = null;

  private activeEntry: QueueEntry | null = null;

  private timeout: NodeJS.Timeout | null = null;

  private isPending = false;

  private queue: QueueEntry[] = [];

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

    const active = this.activeEntry;
    this.activeRequestId = null;
    this.activeEntry = null;
    this.isPending = false;

    if (active && !active.settled) {
      active.settled = true;
      active.cb(null);
      active.options?.onDone?.();
    }

    const drained = this.queue;
    this.queue = [];
    drained.forEach((entry) => {
      if (entry.settled) {
        return;
      }
      entry.settled = true;
      entry.cb(null);
      entry.options?.onDone?.();
    });
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
    this.activeEntry = null;
    this.isPending = false;
  }

  get pending(): boolean {
    return this.isPending;
  }

  private finishActive(entry: QueueEntry): void {
    this.markComplete();
    entry.settled = true;
    entry.options?.onDone?.();
    this.processNext();
  }

  private cancelActiveEntry(entry: QueueEntry): void {
    this.removeListenerOnly();
    this.markComplete();
    entry.settled = true;
    entry.cb(null);
    entry.options?.onDone?.();
  }

  private processNext(): void {
    const entry = this.queue.shift();
    if (!entry) {
      return;
    }

    if (entry.options?.isStillValid && !entry.options.isStillValid()) {
      entry.settled = true;
      entry.cb(null);
      entry.options?.onDone?.();
      this.processNext();
      return;
    }

    this.startRequest(entry);
  }

  private startRequest(entry: QueueEntry): void {
    this.removeListenerOnly();

    const { requestId } = entry;
    this.activeRequestId = requestId;
    this.activeEntry = entry;
    this.isPending = true;

    const listener = async (_event: Event, sourceId: string | null) => {
      if (this.activeRequestId !== requestId) {
        return;
      }

      if (entry.settled) {
        return;
      }

      this.removeListenerOnly();

      if (!sourceId) {
        entry.cb(null);
        this.finishActive(entry);
        return;
      }

      try {
        const cachedSources = getCachedSources();

        if (cachedSources.length > 0) {
          const selectedSource = cachedSources.find((s) => s.id === sourceId);

          if (!selectedSource) {
            console.warn(
              `${this.label}: selected source no longer available:`,
              sourceId
            );
            entry.cb(null);
            this.finishActive(entry);
            return;
          }

          entry.cb({ video: selectedSource });
          this.finishActive(entry);
          return;
        }

        // Cache is empty: fall back to a single direct enumeration attempt.
        const sources = await desktopCapturer.getSources({
          types: ['window', 'screen'],
        });

        if (entry.settled) {
          return;
        }

        const selectedSource = sources.find((s) => s.id === sourceId);

        if (!selectedSource) {
          console.warn(
            `${this.label}: selected source no longer available:`,
            sourceId
          );
          entry.cb(null);
          this.finishActive(entry);
          return;
        }

        entry.cb({ video: selectedSource });
        this.finishActive(entry);
      } catch (error) {
        if (entry.settled) {
          return;
        }

        console.error(`${this.label}: error validating source:`, error);
        entry.cb(null);
        this.finishActive(entry);
      }
    };

    this.activeListener = listener;

    this.timeout = setTimeout(() => {
      if (this.activeRequestId !== requestId) {
        return;
      }

      if (entry.settled) {
        return;
      }

      console.warn(`${this.label}: request timed out, cleaning up`);
      this.removeListenerOnly();
      entry.cb(null);
      this.finishActive(entry);
    }, this.timeoutMs);

    ipcMain.once(this.responseChannel, listener);
    entry.sendOpenPicker();
  }

  createRequest(
    cb: DisplayMediaCallback,
    sendOpenPicker: () => void,
    options?: CreateRequestOptions
  ): ScreenSharingRequestHandle {
    const requestId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const entry: QueueEntry = {
      requestId,
      cb,
      sendOpenPicker,
      options,
      settled: false,
    };

    if (this.isPending) {
      this.queue.push(entry);
    } else {
      this.cleanup();
      this.startRequest(entry);
    }

    return {
      cancel: () => {
        if (entry.settled) {
          return;
        }

        if (this.activeEntry === entry) {
          this.cancelActiveEntry(entry);
          this.processNext();
          return;
        }

        const index = this.queue.indexOf(entry);
        if (index !== -1) {
          this.queue.splice(index, 1);
          entry.settled = true;
          entry.cb(null);
          entry.options?.onDone?.();
        }
      },
    };
  }

  cancelAll(): void {
    if (this.activeEntry && !this.activeEntry.settled) {
      this.cancelActiveEntry(this.activeEntry);
    }

    const drained = this.queue;
    this.queue = [];
    drained.forEach((entry) => {
      if (entry.settled) {
        return;
      }
      entry.settled = true;
      entry.cb(null);
      entry.options?.onDone?.();
    });
  }
}
