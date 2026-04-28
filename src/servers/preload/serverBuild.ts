import { dispatch } from '../../store';
import { WEBVIEW_SERVER_BUILD_CHECK } from '../../ui/actions';
import { getServerUrl } from './urls';

type BuildSignals = {
  buildId?: string;
  cacheVersion?: string;
  buildIdSource?: 'commit' | 'version';
};

let pendingSignal: BuildSignals | null = null;
let storeReady = false;

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

export const setServerBuildSignals = (signals: BuildSignals): void => {
  const { buildId, cacheVersion } = signals;
  if (!buildId && !cacheVersion) return;
  if (storeReady) {
    doDispatch(signals);
  } else {
    // Store not ready yet — queue the most recent signal. The flush will
    // dispatch it once createRendererReduxStore() has resolved.
    pendingSignal = signals;
  }
};

/**
 * Must be called once, immediately after createRendererReduxStore() resolves.
 * Replays any build signal that arrived before the store was initialised.
 */
export const flushPendingBuildSignal = (): void => {
  storeReady = true;
  if (!pendingSignal) return;
  const signal = pendingSignal;
  pendingSignal = null;
  doDispatch(signal);
};
