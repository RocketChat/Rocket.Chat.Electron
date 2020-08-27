import { WebContents, ipcMain, ipcRenderer } from 'electron';
import { Middleware, MiddlewareAPI, Dispatch } from 'redux';

import { isFSA, FluxStandardAction } from './fsa';

const enum ReduxIpcChannel {
  GET_INITIAL_STATE = 'redux/get-initial-state',
  ACTION_DISPATCHED = 'redux/action-dispatched',
}

const enum ActionScope {
  LOCAL = 'local',
}

export const forwardToRenderers: Middleware = (api: MiddlewareAPI) => {
  const renderers = new Set<WebContents>();

  ipcMain.handle(ReduxIpcChannel.GET_INITIAL_STATE, (event) => {
    const webContents = event.sender;

    renderers.add(webContents);

    webContents.addListener('destroyed', () => {
      renderers.delete(webContents);
    });

    return api.getState();
  });

  ipcMain.addListener(ReduxIpcChannel.ACTION_DISPATCHED, (_event, action) => {
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
      webContents.send(ReduxIpcChannel.ACTION_DISPATCHED, rendererAction);
    });

    return next(action);
  };
};

export const getInitialState = (): Promise<any> =>
  ipcRenderer.invoke(ReduxIpcChannel.GET_INITIAL_STATE);

export const forwardToMain: Middleware = (api: MiddlewareAPI) => {
  ipcRenderer.addListener(ReduxIpcChannel.ACTION_DISPATCHED, (_event, action) => {
    api.dispatch(action);
  });

  return (next: Dispatch) => (action: FluxStandardAction<string, unknown>) => {
    if (!isFSA(action)) {
      return next(action);
    }

    if (action.meta && action.meta.scope === ActionScope.LOCAL) {
      return next(action);
    }

    ipcRenderer.send(ReduxIpcChannel.ACTION_DISPATCHED, action);
    return action;
  };
};
