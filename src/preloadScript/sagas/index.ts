import { fork } from '../../common/effects/fork';
import { notificationsSaga } from './notificationsSaga';
import { screenSharingSaga } from './screenSharingSaga';

export function* rootSaga(serverUrl: string): Generator {
  yield* fork(notificationsSaga, serverUrl);
  yield* fork(screenSharingSaga);
}
