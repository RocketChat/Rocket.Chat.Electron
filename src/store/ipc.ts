import { WebContents } from 'electron';
import { Middleware, MiddlewareAPI, Dispatch } from 'redux';

import { handle as handleOnMain, invoke as invokeFromMain } from '../ipc/main';
import {
  handle as handleFromRenderer,
  invoke as invokeFromRenderer,
} from '../ipc/renderer';
import {
  isFSA,
  FluxStandardAction,
  isLocallyScoped,
  hasMeta,
  isSingleScoped,
} from './fsa';

const enum ActionScope {
  LOCAL = 'local',
  SINGLE = 'single',
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

  handleOnMain('redux/action-dispatched', async (webContents, action) => {
    api.dispatch({
      ...action,
      ipcMeta: {
        webContentsId: webContents.id,
        ...(webContents.hostWebContents?.id && {
          viewInstanceId: webContents.hostWebContents?.id,
        }),
        ...action.ipcMeta,
      },
    });
  });

  return (next: Dispatch) => (action: FluxStandardAction<string, unknown>) => {
    if (!isFSA(action) || isLocallyScoped(action)) {
      return next(action);
    }
    const rendererAction = {
      ...action,
      meta: {
        ...(hasMeta(action) && action.meta),
        scope: ActionScope.LOCAL,
      },
    };
    if (isSingleScoped(action)) {
      const { webContentsId, viewInstanceId } = action.ipcMeta;
      [...renderers]
        .filter(
          (w) =>
            w.id === webContentsId ||
            (viewInstanceId && w.id === viewInstanceId)
        )
        .forEach((w) =>
          invokeFromMain(w, 'redux/action-dispatched', rendererAction)
        );
      return next(action);
    }
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
    if (!isFSA(action) || isLocallyScoped(action)) {
      return next(action);
    }

    invokeFromRenderer('redux/action-dispatched', action);
    return action;
  };
};
