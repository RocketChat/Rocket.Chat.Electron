import { powerMonitor } from 'electron';
import { eventChannel, Task } from 'redux-saga';
import { takeLatest, delay, cancel } from 'redux-saga/effects';

import * as serverActions from '../../common/actions/serverActions';
import { cancelled } from '../../common/effects/cancelled';
import { fork } from '../../common/effects/fork';
import { put } from '../../common/effects/put';
import { select } from '../../common/effects/select';

const powerEvents = eventChannel<
  'suspend' | 'resume' | 'lock-screen' | 'unlock-screen'
>((emit) => {
  const handleSuspend = () => emit('suspend');
  const handleResume = () => emit('resume');
  const handleLockScreen = () => emit('lock-screen');
  const handleUnlockScreen = () => emit('unlock-screen');

  powerMonitor.on('suspend', handleSuspend);
  powerMonitor.on('resume', handleResume);
  powerMonitor.on('lock-screen', handleLockScreen);
  powerMonitor.on('unlock-screen', handleUnlockScreen);

  return () => {
    powerMonitor.off('suspend', handleSuspend);
    powerMonitor.off('resume', handleResume);
    powerMonitor.off('lock-screen', handleLockScreen);
    powerMonitor.off('unlock-screen', handleUnlockScreen);
  };
});

function* notifyLockedState() {
  const servers = yield* select((state) => state.servers);

  for (const { url, presence } of servers) {
    if (!presence?.autoAwayEnabled) {
      continue;
    }

    yield put(serverActions.idleStateChanged(url, 'locked'));
  }
}

function* notifyIdleStateChanges() {
  const servers = yield* select((state) => state.servers);

  for (const { url, presence } of servers) {
    if (!presence?.autoAwayEnabled) {
      continue;
    }

    const { idleThreshold } = presence;

    if (idleThreshold === null) {
      return;
    }

    const idleState = powerMonitor.getSystemIdleState(idleThreshold);
    yield put(serverActions.idleStateChanged(url, idleState));
  }
}

function* loopIdleState() {
  try {
    for (;;) {
      yield* notifyIdleStateChanges();
      yield delay(500);
    }
  } finally {
    if (yield* cancelled()) {
      yield* notifyLockedState();
    }
  }
}

let loopTask: Task;

export function* userPresenceSaga(): Generator {
  yield takeLatest(powerEvents, function* (powerEvent) {
    if (powerEvent === 'suspend' || powerEvent === 'lock-screen') {
      yield cancel(loopTask);
      return;
    }

    loopTask = yield* fork(loopIdleState);
  });

  loopTask = yield* fork(loopIdleState);
}
