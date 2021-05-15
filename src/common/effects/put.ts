import { StrictEffect, put as _put } from 'redux-saga/effects';

import type { RootAction } from '../types/RootAction';

export function* put(
  action: RootAction
): Generator<StrictEffect, void, unknown> {
  yield _put(action);
}
