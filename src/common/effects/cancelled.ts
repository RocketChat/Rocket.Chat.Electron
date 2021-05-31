import { StrictEffect, cancelled as _cancelled } from 'redux-saga/effects';

export function* cancelled(): Generator<StrictEffect, boolean, unknown> {
  return (yield _cancelled()) as boolean;
}
