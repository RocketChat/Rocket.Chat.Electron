import { dispatch } from '../../store';
import { WEBVIEW_FORCE_RELOAD_WITH_CACHE_CLEAR } from '../../ui/actions';
import { getServerUrl } from './urls';

export const reloadServer = (): void => {
  const url = getServerUrl();

  // Dispatch action to trigger force reload with cache clear
  dispatch({
    type: WEBVIEW_FORCE_RELOAD_WITH_CACHE_CLEAR,
    payload: url,
  });
};
