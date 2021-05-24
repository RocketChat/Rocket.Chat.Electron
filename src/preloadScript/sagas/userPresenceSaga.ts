import { watch } from '../../common/effects/watch';
import type { RocketChatDesktopAPI } from '../../common/types/RocketChatDesktopAPI';
import type { Server } from '../../common/types/Server';

export function* userPresenceSaga(
  url: Server['url'],
  rocketChatDesktopRef: {
    current: null | RocketChatDesktopAPI;
  }
): Generator {
  yield* watch(
    (state) => state.servers.find((server) => server.url === url),
    function* (server) {
      if (!server?.presence?.autoAwayEnabled) {
        return;
      }

      const { idleState } = server.presence;

      const isOnline = idleState === 'active' || idleState === 'unknown';
      rocketChatDesktopRef.current?.setUserOnline(isOnline);
    }
  );
}
