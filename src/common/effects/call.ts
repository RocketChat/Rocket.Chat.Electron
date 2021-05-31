import {
  StrictEffect,
  call as _call,
  SagaReturnType,
} from 'redux-saga/effects';

export function* call<Fn extends (...args: any[]) => any>(
  fn: Fn,
  ...args: Parameters<Fn>
): Generator<StrictEffect, SagaReturnType<Fn>, unknown> {
  return (yield _call(fn, ...args)) as SagaReturnType<Fn>;
}
