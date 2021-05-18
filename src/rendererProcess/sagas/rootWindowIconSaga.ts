import * as rootWindowActions from '../../common/actions/rootWindowActions';
import { selectGlobalBadge } from '../../common/badgeSelectors';
import { call } from '../../common/effects/call';
import { put } from '../../common/effects/put';
import { watch } from '../../common/effects/watch';
import type { RootState } from '../../common/types/RootState';
import {
  createRootWindowIconForLinux,
  createRootWindowIconForWindows,
} from '../rootWindowIcon';

const selectParams = (state: RootState) => {
  const { platform } = state.app;
  const { view } = state.ui;

  if (platform === 'darwin' || typeof view !== 'object') {
    return undefined;
  }

  const { servers } = state;
  const favicon = servers.find((server) => server.url === view.url)?.favicon;

  if (!favicon) {
    return undefined;
  }

  const badge = selectGlobalBadge(state);

  return {
    platform,
    favicon,
    badge,
  };
};

export function* rootWindowIconSaga(): Generator {
  yield* watch(selectParams, function* (params) {
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
    }
  });
}
