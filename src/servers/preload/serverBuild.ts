import { dispatch } from '../../store';
import { WEBVIEW_SERVER_BUILD_CHECK } from '../../ui/actions';
import { getServerUrl } from './urls';

export const setServerBuildSignals = (signals: {
  buildId?: string;
  cacheVersion?: string;
}): void => {
  const { buildId, cacheVersion } = signals;
  if (!buildId && !cacheVersion) return;
  dispatch({
    type: WEBVIEW_SERVER_BUILD_CHECK,
    payload: {
      url: getServerUrl(),
      buildId,
      cacheVersion,
    },
  });
};
