import { StrictEffect, select as _select } from 'redux-saga/effects';

import type { RootState } from '../types/RootState';

export function select(): Generator<StrictEffect, RootState, unknown>;
export function select<T>(
  selector: (state: RootState) => T
): Generator<StrictEffect, T, unknown>;
export function* select<T>(
  selector?: (state: RootState) => T
): Generator<StrictEffect, RootState | T, unknown> {
  if (!selector) {
    return (yield _select()) as RootState;
  }

  return (yield _select(selector)) as T;
}
