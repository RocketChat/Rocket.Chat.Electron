import type { IndexKey, MemoryOnlyReason } from './keyStore';
import type { WorkerOpenResult } from './workerProtocol';

// Why an index runs with less than the full file store: the key stays in
// memory (a `MemoryOnlyReason`), or the native search module did not load.
export type IndexLimitReason = MemoryOnlyReason | 'native-module-unavailable';

export type IndexLimit = {
  store: WorkerOpenResult['store'];
  reason?: IndexLimitReason;
};

// A memory-only key explains the limit first, because it also forces the
// snapshot store.
// The worker reuses an index that is already open (a page reload, another
// webview of the server), with the at-rest state of the key that made it.
// When that state is not the state of this key, the limit of the open that
// made the index still holds.
export const indexLimitOf = (
  indexKey: IndexKey,
  {
    store,
    fileStoreError,
    encryptedAtRest,
  }: Pick<WorkerOpenResult, 'store' | 'fileStoreError' | 'encryptedAtRest'>,
  limitOfOpenIndex?: IndexLimit
): IndexLimit => {
  if (limitOfOpenIndex && encryptedAtRest !== indexKey.persistent)
    return limitOfOpenIndex;
  if (!indexKey.persistent) return { store, reason: indexKey.reason };
  if (fileStoreError) return { store, reason: 'native-module-unavailable' };
  return { store };
};

export const limitedReasonOf = (
  limits: IndexLimit[]
): IndexLimitReason | undefined =>
  limits.find((limit) => limit.reason !== undefined)?.reason;
