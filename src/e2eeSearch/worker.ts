import { createWorkerHandler } from './workerHandler';
import type { WorkerRequest } from './workerProtocol';

// The utility process entry (rollup builds it to app/e2eeSearchWorker.js).
// The SQLite database stays in this process, so a slow query or a large
// snapshot write does not block the main process.
const { DatabaseSync } = process.getBuiltinModule('node:sqlite');
const handler = createWorkerHandler({ DatabaseSync });

process.parentPort.on('message', ({ data }) => {
  void handler
    .handle(data as WorkerRequest)
    .then((response) => process.parentPort.postMessage(response));
});
