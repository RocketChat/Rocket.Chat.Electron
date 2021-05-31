import type { Action } from 'redux';
import { ActionPattern, StrictEffect, take as _take } from 'redux-saga/effects';

export function* take<A extends Action>(
  pattern?: ActionPattern<A>
): Generator<StrictEffect, A, unknown> {
  return (yield _take(pattern)) as A;
}
