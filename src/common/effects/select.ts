import { StrictEffect, select as _select } from 'redux-saga/effects';

import type { RootState } from '../types/RootState';

export function* select<T>(
  selector: (state: RootState) => T
): Generator<StrictEffect, T, T> {
  return yield _select(selector);
}
