import type { WorkerTransport } from '../host';
import { createWorkerHandler } from '../workerHandler';
import type { WorkerResponse } from '../workerProtocol';

const { DatabaseSync } = process.getBuiltinModule('node:sqlite');

// An in-process stand-in for the utility process. Each spawn gets a new
// handler, so a crash loses the in-memory database like a real worker does.
export const createFakeWorkers = () => {
  const spawned: Array<{ crash: () => void; killed: boolean }> = [];
  const methods: string[] = [];
  let stall = false;

  const spawn = (): WorkerTransport => {
    const handler = createWorkerHandler({ DatabaseSync });
    const messageListeners: Array<(response: WorkerResponse) => void> = [];
    const exitListeners: Array<(code: number) => void> = [];
    let alive = true;
    const entry = {
      killed: false,
      crash: () => {
        alive = false;
        exitListeners.forEach((listener) => listener(1));
      },
    };
    spawned.push(entry);
    return {
      postMessage: (request) => {
        methods.push(request.method);
        if (stall) return;
        void handler.handle(request).then((response) => {
          if (alive) messageListeners.forEach((listener) => listener(response));
        });
      },
      onMessage: (listener) => messageListeners.push(listener),
      onExit: (listener) => exitListeners.push(listener),
      kill: () => {
        alive = false;
        entry.killed = true;
      },
    };
  };

  return {
    spawn,
    spawned,
    methods,
    setStall: (value: boolean) => {
      stall = value;
    },
  };
};
