import { watch } from '../common/store';
import type { RocketChatDesktopAPI } from '../common/types/RocketChatDesktopAPI';

export const listenUserPresenceChanges = (
  rocketChatDesktop: RocketChatDesktopAPI
): void => {
  watch(
    (state) =>
      state.servers.find(
        (server) => server.url === rocketChatDesktop.getServerUrl()
      ),
    (server) => {
      if (!server?.presence?.autoAwayEnabled) {
        return;
      }

      const { idleState } = server.presence;

      const isOnline = idleState === 'active' || idleState === 'unknown';
      rocketChatDesktop.setUserOnline(isOnline);
    }
  );
};
