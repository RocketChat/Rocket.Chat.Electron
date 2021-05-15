import * as serverActions from '../common/actions/serverActions';
import { dispatch, watch } from '../common/store';
import { getServerUrl } from './setUrlResolver';

let unwatch: () => void;

export const setUserPresenceDetection = ({
  isAutoAwayEnabled,
  idleThreshold,
  setUserOnline,
}: {
  isAutoAwayEnabled: boolean;
  idleThreshold: number | null;
  setUserOnline: (online: boolean) => void;
}): void => {
  unwatch?.();

  if (!isAutoAwayEnabled) {
    dispatch(
      serverActions.presenceParamsSet(getServerUrl(), {
        autoAwayEnabled: false,
      })
    );
    return;
  }

  dispatch(
    serverActions.presenceParamsSet(getServerUrl(), {
      autoAwayEnabled: true,
      idleThreshold,
    })
  );

  unwatch = watch(
    (state) => state.servers.find((server) => server.url === getServerUrl()),
    (server) => {
      if (!server?.presence?.autoAwayEnabled) {
        return;
      }

      const { idleState } = server.presence;

      const isOnline = idleState === 'active' || idleState === 'unknown';
      setUserOnline(isOnline);
    }
  );
};
