import type { Task } from 'redux-saga';
import { StrictEffect, takeLatest } from 'redux-saga/effects';

import type { RootState } from '../types/RootState';
import { select } from './select';

export function* watch<
  T,
  GF extends (curr: T, prev: T | undefined) => Generator
>(
  selector: (state: RootState) => T,
  watcher: GF
): Generator<StrictEffect, Task> {
  let prev: T | undefined = undefined;

  return (yield takeLatest('*', function* () {
    const curr: T = yield* select(selector);

    if (Object.is(prev, curr)) {
      return;
    }

    watcher(curr, prev);

    prev = curr;
  })) as Task;
}
