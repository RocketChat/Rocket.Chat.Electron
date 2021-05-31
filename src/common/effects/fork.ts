import type { Task } from 'redux-saga';
import { StrictEffect, fork as _fork } from 'redux-saga/effects';

export function* fork<GF extends (...args: any[]) => Generator>(
  saga: GF,
  ...args: Parameters<GF>
): Generator<StrictEffect, Task, unknown> {
  return (yield _fork(saga, ...args)) as Task;
}
