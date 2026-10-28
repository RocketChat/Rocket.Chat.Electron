import type {
  WorkerMethod,
  WorkerOpenArgs,
  WorkerRequest,
  WorkerResponse,
} from './workerProtocol';
import { MUTATING_METHODS } from './workerProtocol';

// The design debounces snapshot writes by 30 s after the last change.
export const SAVE_DELAY_MS = 30_000;
// Under steady traffic (a backfill, a busy room) the debounce never ends, so
// a save also runs at most this long after the first unsaved change.
export const SAVE_MAX_WAIT_MS = 60_000;

export type WorkerTransport = {
  postMessage(request: WorkerRequest): void;
  onMessage(listener: (response: WorkerResponse) => void): void;
  onExit(listener: (code: number) => void): void;
  kill(): void;
};

export class WorkerExitedError extends Error {
  constructor(code: number) {
    super(`E2EE search worker exited with code ${code}`);
    this.name = 'WorkerExitedError';
  }
}

type Pending = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

type Queued = Pending & { method: WorkerMethod; args: unknown[] };

type HostOptions = {
  spawn: () => WorkerTransport;
  saveDelayMs?: number;
  saveMaxWaitMs?: number;
  onSaveError?: (indexId: string, error: unknown) => void;
};

export type SearchHost = {
  open(indexId: string, args: WorkerOpenArgs): Promise<unknown>;
  call(
    indexId: string,
    method: WorkerMethod,
    ...args: unknown[]
  ): Promise<unknown>;
  close(indexId: string): Promise<void>;
  // Closes the index and drops its unsaved changes. It waits for a running
  // save, so the caller can delete the folder after it.
  discard(indexId: string): Promise<void>;
  indexIds(): string[];
  hasUnsavedChanges(): boolean;
  // Saves every changed index now. The app calls it before quit.
  flush(): Promise<void>;
  dispose(): Promise<void>;
};

// Runs in the main process. It starts the worker on the first call, and it
// starts a new worker after a crash: the next call opens each index again
// from its last snapshot. Changes after the last snapshot are lost, which is
// safe because the index is a cache that the web client fills again.
export const createSearchHost = ({
  spawn,
  saveDelayMs = SAVE_DELAY_MS,
  saveMaxWaitMs = SAVE_MAX_WAIT_MS,
  onSaveError,
}: HostOptions): SearchHost => {
  let worker: WorkerTransport | undefined;
  let nextId = 1;
  const pending = new Map<number, Pending>();
  // Each index has at most one call in the worker. The others wait here, so
  // a server that sends many calls cannot put the calls of another server
  // at the end of the worker's queue.
  const queued = new Map<string, Queued[]>();
  const busy = new Set<string>();
  const openArgs = new Map<string, WorkerOpenArgs>();
  const needsOpen = new Set<string>();
  const dirty = new Set<string>();
  const dirtySince = new Map<string, number>();
  const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const saving = new Map<string, Promise<void>>();
  // The open and close calls of one index run in order. A reload closes the
  // old document's session while the new page opens the same index, and a
  // close that finishes after that open would drop the new session's index.
  const lifecycle = new Map<string, Promise<unknown>>();

  const inOrder = <T>(indexId: string, task: () => Promise<T>): Promise<T> => {
    const next = (lifecycle.get(indexId) ?? Promise.resolve()).then(task, task);
    const tail = next.catch(() => undefined);
    lifecycle.set(indexId, tail);
    void tail.then(() => {
      if (lifecycle.get(indexId) === tail) lifecycle.delete(indexId);
    });
    return next;
  };

  const start = (): WorkerTransport => {
    if (worker) return worker;
    const current = spawn();
    worker = current;
    current.onMessage((response) => {
      const call = pending.get(response.id);
      if (!call) return;
      pending.delete(response.id);
      if (response.ok) {
        call.resolve(response.value);
        return;
      }
      const error = new Error(response.error.message);
      error.name = response.error.name;
      call.reject(error);
    });
    current.onExit((code) => {
      if (worker !== current) return;
      worker = undefined;
      for (const indexId of openArgs.keys()) needsOpen.add(indexId);
      failAll(new WorkerExitedError(code));
    });
    return current;
  };

  // A waiting call skipped the reopen check, so a new worker must not get
  // it: it fails like the calls that were in the worker.
  const failAll = (error: Error) => {
    const failed = [...pending.values(), ...[...queued.values()].flat()];
    pending.clear();
    queued.clear();
    busy.clear();
    for (const call of failed) call.reject(error);
  };

  const post = (indexId: string, call: Queued) => {
    const id = nextId++;
    pending.set(id, call);
    start().postMessage({ id, indexId, method: call.method, args: call.args });
  };

  const postNext = (indexId: string) => {
    if (busy.has(indexId)) return;
    const queue = queued.get(indexId);
    const next = queue?.shift();
    if (!queue || !next) return;
    if (queue.length === 0) queued.delete(indexId);
    busy.add(indexId);
    const done = () => {
      busy.delete(indexId);
      postNext(indexId);
    };
    post(indexId, {
      ...next,
      resolve: (value) => {
        done();
        next.resolve(value);
      },
      reject: (error) => {
        done();
        next.reject(error);
      },
    });
  };

  const send = (
    indexId: string,
    method: WorkerMethod,
    args: unknown[]
  ): Promise<unknown> =>
    new Promise((resolve, reject) => {
      const call: Queued = { method, args, resolve, reject };
      // Only the host starts a save, one at a time per index. The worker
      // waits for the disk during a save, so the calls of the same index
      // can run in that time, as they did before the queue.
      if (method === 'save') {
        post(indexId, call);
        return;
      }
      const queue = queued.get(indexId) ?? [];
      queue.push(call);
      queued.set(indexId, queue);
      postNext(indexId);
    });

  const cancelSave = (indexId: string) => {
    clearTimeout(saveTimers.get(indexId));
    saveTimers.delete(indexId);
  };

  const markClean = (indexId: string) => {
    dirty.delete(indexId);
    dirtySince.delete(indexId);
  };

  const save = async (indexId: string) => {
    cancelSave(indexId);
    // One save of an index at a time: a second save waits for the first.
    for (let running = saving.get(indexId); running; ) {
      // eslint-disable-next-line no-await-in-loop -- waits for the save that runs now
      await running;
      running = saving.get(indexId);
    }
    if (!dirty.has(indexId)) return;
    markClean(indexId);
    const running = call(indexId, 'save').then(
      () => undefined,
      (error) => onSaveError?.(indexId, error)
    );
    saving.set(indexId, running);
    try {
      await running;
    } finally {
      if (saving.get(indexId) === running) saving.delete(indexId);
    }
  };

  const scheduleSave = (indexId: string) => {
    const now = Date.now();
    if (!dirty.has(indexId)) dirtySince.set(indexId, now);
    dirty.add(indexId);
    const deadline = (dirtySince.get(indexId) ?? now) + saveMaxWaitMs;
    clearTimeout(saveTimers.get(indexId));
    saveTimers.set(
      indexId,
      setTimeout(
        () => {
          void save(indexId);
        },
        Math.max(0, Math.min(saveDelayMs, deadline - now))
      )
    );
  };

  async function call(
    indexId: string,
    method: WorkerMethod,
    ...args: unknown[]
  ): Promise<unknown> {
    if (needsOpen.has(indexId)) {
      const reopen = openArgs.get(indexId);
      if (reopen) await send(indexId, 'open', [reopen]);
      needsOpen.delete(indexId);
    }
    const value = await send(indexId, method, args);
    if (MUTATING_METHODS.has(method)) scheduleSave(indexId);
    return value;
  }

  // A running save counts too: its index is clean in `dirty`, but its
  // changes are not on disk yet.
  const unsavedIndexIds = () => new Set([...dirty, ...saving.keys()]);

  const flush = async () => {
    await Promise.all([...unsavedIndexIds()].map(save));
  };

  return {
    open: (indexId, args) =>
      inOrder(indexId, async () => {
        const value = await send(indexId, 'open', [args]);
        openArgs.set(indexId, args);
        needsOpen.delete(indexId);
        return value;
      }),

    call,

    close: (indexId) =>
      inOrder(indexId, async () => {
        // A call that was in flight can change the index while the save
        // runs, so save again until nothing is left to save.
        do {
          // eslint-disable-next-line no-await-in-loop -- saves the changes that came in during the last save
          await save(indexId);
        } while (dirty.has(indexId));
        openArgs.delete(indexId);
        needsOpen.delete(indexId);
        if (worker) await send(indexId, 'close', []);
      }),

    async discard(indexId) {
      cancelSave(indexId);
      markClean(indexId);
      openArgs.delete(indexId);
      needsOpen.delete(indexId);
      await saving.get(indexId);
      if (worker) await send(indexId, 'close', []).catch(() => undefined);
    },

    indexIds: () => [...openArgs.keys()],

    hasUnsavedChanges: () => unsavedIndexIds().size > 0,

    flush,

    async dispose() {
      await flush();
      const current = worker;
      worker = undefined;
      current?.kill();
      failAll(new WorkerExitedError(0));
    },
  };
};

// A quit waits at most `timeoutMs` for the last save. When the limit ends the
// wait first, the save is lost, and `onTimeout` runs so that the log shows it.
export const disposeBeforeQuit = (
  host: Pick<SearchHost, 'dispose'>,
  timeoutMs: number,
  onTimeout: () => void
): Promise<void> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(() => {
      onTimeout();
      resolve();
    }, timeoutMs);
  });
  return Promise.race([host.dispose(), timeout]).finally(() =>
    clearTimeout(timer)
  );
};
