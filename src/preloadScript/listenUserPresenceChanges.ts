import { watch } from '../common/store';
import { setUserOnline } from './RocketChatDesktop';
import { getServerUrl } from './setUrlResolver';

export const listenUserPresenceChanges = (): void => {
  watch(
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
