import { fork } from '../../common/effects/fork';
import { deepLinksSaga } from './deepLinksSaga';
import { downloadsSaga } from './downloadsSaga';
import { navigationSaga } from './navigationSaga';
import { notificationsSaga } from './notificationsSaga';
import { persistenceSaga } from './persistenceSaga';
import { rootWindowSaga } from './rootWindowSaga';
import { spellCheckingSaga } from './spellCheckingSaga';
import { updatesSaga } from './updatesSaga';
import { userPresenceSaga } from './userPresenceSaga';

export function* rootSaga(): Generator {
  yield* fork(deepLinksSaga);
  yield* fork(downloadsSaga);
  yield* fork(navigationSaga);
  yield* fork(notificationsSaga);
  yield* fork(persistenceSaga);
  yield* fork(rootWindowSaga);
  yield* fork(spellCheckingSaga);
  yield* fork(updatesSaga);
  yield* fork(userPresenceSaga);
}
