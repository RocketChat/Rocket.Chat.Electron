import { openEncryptedIndexFile } from './fileStore';
import {
  createWorkerHandler,
  fileStoreSelected,
  zeroRequestKey,
} from './workerHandler';
import type { WorkerRequest } from './workerProtocol';

// The utility process entry (rollup builds it to app/e2eeSearchWorker.js).
// The SQLite database stays in this process, so a slow query or a large
// snapshot write does not block the main process.
const { DatabaseSync } = process.getBuiltinModule('node:sqlite');

// The file store is the default. The open result tells the main
// process when the worker fell back to the snapshot store.
const handler = createWorkerHandler({
  DatabaseSync,
  ...(fileStoreSelected(process.env.ROCKETCHAT_E2EE_SEARCH_STORE) && {
    openEncryptedFile: openEncryptedIndexFile,
  }),
});

process.parentPort.on('message', ({ data }) => {
  const request = data as WorkerRequest;
  void handler.handle(request).then((response) => {
    zeroRequestKey(request);
    process.parentPort.postMessage(response);
  });
});
