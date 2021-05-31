import type { Middleware, MiddlewareAPI, Dispatch } from 'redux';

import { isFSA, FluxStandardAction, isLocallyScoped } from '../common/fsa';
import { handle, invoke } from '../ipc/renderer';

export const forwardToMain: Middleware = (api: MiddlewareAPI) => {
  handle('redux/action-dispatched', async (action) => {
    api.dispatch(action);
  });

  return (next: Dispatch) => (action: FluxStandardAction<string, unknown>) => {
    if (!isFSA(action) || isLocallyScoped(action)) {
      return next(action);
    }

    invoke('redux/action-dispatched', action);
    return action;
  };
};
