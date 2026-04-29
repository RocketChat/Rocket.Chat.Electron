import { dispatch, safeSelect } from '../../store';
import { WEBVIEW_SERVER_BUILD_CHECK } from '../../ui/actions';
import { getServerUrl } from './urls';

type BuildSignals = {
  buildId?: string;
  cacheVersion?: string;
  buildIdSource?: 'commit' | 'version' | 'autoupdate';
};

type SlotKey = 'commit' | 'version' | 'autoupdate' | 'cacheVersion-only';

const FLUSH_ORDER: SlotKey[] = [
  'commit',
  'version',
  'autoupdate',
  'cacheVersion-only',
];
const RETRY_INTERVAL_MS = 250;
const RETRY_HARD_CAP_MS = 30_000;

const pendingByKey = new Map<SlotKey, BuildSignals>();
let storeReady = false;

const slotKey = (signals: BuildSignals): SlotKey => {
  const { buildId, buildIdSource } = signals;
  if (buildId && buildIdSource) return buildIdSource;
  return 'cacheVersion-only';
};

const doDispatch = (signals: BuildSignals): void => {
  const { buildId, cacheVersion, buildIdSource } = signals;
  dispatch({
    type: WEBVIEW_SERVER_BUILD_CHECK,
    payload: {
      url: getServerUrl(),
      buildId,
      cacheVersion,
      buildIdSource,
    },
  });
};

const isServerReady = (): boolean => {
  const url = getServerUrl();
  const servers = safeSelect(({ servers }) => servers);
  return !!servers?.find((s) => s.url === url);
};

const flushAll = (): void => {
  for (const key of FLUSH_ORDER) {
    const signal = pendingByKey.get(key);
    if (signal) {
      pendingByKey.delete(key);
      doDispatch(signal);
    }
  }
};

let retryHandle: ReturnType<typeof setInterval> | null = null;
let retryStarted = 0;

const startRetry = (): void => {
  if (retryHandle !== null) return;
  retryStarted = Date.now();
  retryHandle = setInterval(() => {
    if (pendingByKey.size === 0) {
      clearInterval(retryHandle!);
      retryHandle = null;
      return;
    }
    if (!isServerReady()) {
      if (Date.now() - retryStarted >= RETRY_HARD_CAP_MS) {
        console.warn(
          '[Rocket.Chat Desktop] serverBuild: server record not ready after 30 s, dropping pending build signals'
        );
        pendingByKey.clear();
        clearInterval(retryHandle!);
        retryHandle = null;
      }
      return;
    }
    clearInterval(retryHandle!);
    retryHandle = null;
    flushAll();
  }, RETRY_INTERVAL_MS);
};

export const setServerBuildSignals = (signals: BuildSignals): void => {
  const { buildId, cacheVersion } = signals;
  if (!buildId && !cacheVersion) return;

  if (storeReady) {
    if (isServerReady()) {
      doDispatch(signals);
    } else {
      pendingByKey.set(slotKey(signals), signals);
      startRetry();
    }
  } else {
    pendingByKey.set(slotKey(signals), signals);
  }
};

/**
 * Must be called once, immediately after createRendererReduxStore() resolves.
 * Replays any build signals that arrived before the store was initialised.
 */
export const flushPendingBuildSignal = (): void => {
  storeReady = true;
  if (pendingByKey.size === 0) return;
  if (isServerReady()) {
    flushAll();
  } else {
    startRetry();
  }
};
