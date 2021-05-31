import { call } from '../../common/effects/call';
import { select } from '../../common/effects/select';
import { setupBugsnag } from '../../common/setupBugsnag';

export function* errorHandlingSaga(): Generator {
  const appVersion = yield* select((state) => state.app.version);
  const bugsnagApiKey = yield* select((state) => state.app.bugsnagApiKey);

  if (bugsnagApiKey) {
    yield* call(setupBugsnag, bugsnagApiKey, appVersion, 'webviewPreload');
  }
}
