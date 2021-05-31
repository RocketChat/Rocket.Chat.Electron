import { fork } from '../../common/effects/fork';
import type { RocketChatDesktopAPI } from '../../common/types/RocketChatDesktopAPI';
import { errorHandlingSaga } from './errorHandlingSaga';
import { messageBoxSaga } from './messageBoxSaga';
import { notificationsSaga } from './notificationsSaga';
import { screenSharingSaga } from './screenSharingSaga';
import { trafficLightsSaga } from './trafficLightsSaga';
import { userPresenceSaga } from './userPresenceSaga';

export function* rootSaga(
  serverUrl: string,
  rocketChatDesktopRef: { current: null | RocketChatDesktopAPI }
): Generator {
  yield* fork(errorHandlingSaga);
  yield* fork(messageBoxSaga);
  yield* fork(notificationsSaga, serverUrl);
  yield* fork(screenSharingSaga);
  yield* fork(trafficLightsSaga);
  yield* fork(userPresenceSaga, serverUrl, rocketChatDesktopRef);
}
