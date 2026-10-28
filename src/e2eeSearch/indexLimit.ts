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
export const indexLimitOf = (
  indexKey: IndexKey,
  { store, fileStoreError }: Pick<WorkerOpenResult, 'store' | 'fileStoreError'>
): IndexLimit => {
  if (!indexKey.persistent) return { store, reason: indexKey.reason };
  if (fileStoreError) return { store, reason: 'native-module-unavailable' };
  return { store };
};

export const limitedReasonOf = (
  limits: IndexLimit[]
): IndexLimitReason | undefined =>
  limits.find((limit) => limit.reason !== undefined)?.reason;
