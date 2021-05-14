import type { Middleware, Dispatch } from 'redux';

import type { RootAction } from './actions';

export let lastAction: RootAction;

export const catchLastAction: Middleware =
  () => (next: Dispatch<RootAction>) => (action) => {
    lastAction = action;
    return next(action);
  };
