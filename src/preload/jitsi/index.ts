import { Effect, call } from 'redux-saga/effects';

import { setupJitsiMeetElectron } from './electron';

export const isJitsi = (): boolean =>
  'JitsiMeetJS' in window;

export function *setupJitsiPage(): Generator<Effect, void> {
  yield call(setupJitsiMeetElectron);
}
