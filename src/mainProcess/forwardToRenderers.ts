import type { WebContents } from 'electron';
import type { Middleware, MiddlewareAPI, Dispatch } from 'redux';

import {
  isFSA,
  FluxStandardAction,
  isLocallyScoped,
  hasMeta,
} from '../common/fsa';
import { handle, invoke } from '../ipc/main';

export const forwardToRenderers: Middleware = (api: MiddlewareAPI) => {
  const renderers = new Set<WebContents>();

  handle('redux/get-initial-state', async (webContents) => {
    renderers.add(webContents);

    webContents.addListener('destroyed', () => {
      renderers.delete(webContents);
    });

    return api.getState();
  });

  handle('redux/action-dispatched', async (_, action) => {
    api.dispatch(action);
  });

  return (next: Dispatch) => (action: FluxStandardAction<string, unknown>) => {
    if (!isFSA(action) || isLocallyScoped(action)) {
      return next(action);
    }

    const rendererAction = {
      ...action,
      meta: {
        ...(hasMeta(action) && action.meta),
        scope: 'local',
      },
    };

    renderers.forEach((webContents) => {
      invoke(webContents, 'redux/action-dispatched', rendererAction);
    });

    return next(action);
  };
};
