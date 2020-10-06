import { WebContents } from 'electron';
import { Middleware, MiddlewareAPI, Dispatch } from 'redux';

import { handle as handleOnMain, invoke as invokeFromMain } from '../ipc/main';
import { handle as handleFromRenderer, invoke as invokeFromRenderer } from '../ipc/renderer';
import { isFSA, FluxStandardAction } from './fsa';

const enum ActionScope {
  LOCAL = 'local',
}

export const forwardToRenderers: Middleware = (api: MiddlewareAPI) => {
  const renderers = new Set<WebContents>();

  handleOnMain('redux/get-initial-state', async (webContents) => {
    renderers.add(webContents);

    webContents.addListener('destroyed', () => {
      renderers.delete(webContents);
    });

    return api.getState();
  });

  handleOnMain('redux/action-dispatched', async (_, action) => {
    api.dispatch(action);
  });

  return (next: Dispatch) => (action: FluxStandardAction<string, unknown>) => {
    if (!isFSA(action)) {
      return next(action);
    }

    if (action.meta && action.meta.scope === ActionScope.LOCAL) {
      return next(action);
    }

    const rendererAction: FluxStandardAction<string, unknown> = {
      ...action,
      meta: {
        ...action.meta,
        scope: ActionScope.LOCAL,
      },
    };

    renderers.forEach((webContents) => {
      invokeFromMain(webContents, 'redux/action-dispatched', rendererAction);
    });

    return next(action);
  };
};

export const getInitialState = (): Promise<any> =>
  invokeFromRenderer('redux/get-initial-state');

export const forwardToMain: Middleware = (api: MiddlewareAPI) => {
  handleFromRenderer('redux/action-dispatched', async (action) => {
    api.dispatch(action);
  });

  return (next: Dispatch) => (action: FluxStandardAction<string, unknown>) => {
    if (!isFSA(action)) {
      return next(action);
    }

    if (action.meta && action.meta.scope === ActionScope.LOCAL) {
      return next(action);
    }

    invokeFromRenderer('redux/action-dispatched', action);
    return action;
  };
};
