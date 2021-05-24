import { fork } from '../../common/effects/fork';
import { messageBoxSaga } from './messageBoxSaga';
import { notificationsSaga } from './notificationsSaga';
import { screenSharingSaga } from './screenSharingSaga';

export function* rootSaga(serverUrl: string): Generator {
  yield* fork(messageBoxSaga);
  yield* fork(notificationsSaga, serverUrl);
  yield* fork(screenSharingSaga);
}
