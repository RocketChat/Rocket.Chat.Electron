import * as rootWindowActions from '../../common/actions/rootWindowActions';
import { selectGlobalBadge } from '../../common/badgeSelectors';
import { call } from '../../common/effects/call';
import { put } from '../../common/effects/put';
import { select } from '../../common/effects/select';
import {
  createRootWindowIconForLinux,
  createRootWindowIconForWindows,
} from '../rootWindowIcon';

function* getParams() {
  const platform = yield* select((state) => state.app.platform);
  const view = yield* select((state) => state.ui.view);

  if (platform === 'darwin' || typeof view !== 'object') {
    return undefined;
  }

  const servers = yield* select((state) => state.servers);
  const favicon = servers.find((server) => server.url === view.url)?.favicon;

  if (!favicon) {
    return undefined;
  }

  const badge = yield* select(selectGlobalBadge);

  return {
    platform,
    favicon,
    badge,
  };
}

export function* rootWindowIconSaga(): Generator {
  while (true) {
    const params = yield* getParams();

    if (!params) {
      yield* put(rootWindowActions.iconChanged(undefined));
      return;
    }

    if (params.platform === 'linux') {
      const icon = yield* call(createRootWindowIconForLinux, params);
      yield* put(rootWindowActions.iconChanged(icon));
      return;
    }

    if (params.platform === 'win32') {
      const icon = yield* call(createRootWindowIconForWindows, params);
      yield* put(rootWindowActions.iconChanged(icon));
      return;
    }
  }
}
