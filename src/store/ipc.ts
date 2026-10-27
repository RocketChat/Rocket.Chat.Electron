import type { WebContents } from 'electron';
import type { AnyAction, Middleware, MiddlewareAPI } from 'redux';

import { handle as handleOnMain, invoke as invokeFromMain } from '../ipc/main';
import {
  handle as handleFromRenderer,
  invoke as invokeFromRenderer,
} from '../ipc/renderer';
import { isFSA, isLocallyScoped, hasMeta, isSingleScoped } from './fsa';

const enum ActionScope {
  LOCAL = 'local',
  SINGLE = 'single',
}

export const forwardToRenderers: Middleware = (api: MiddlewareAPI) => {
  const renderers = new Set<WebContents>();

  handleOnMain('redux/get-initial-state', async (webContents) => {
    // A reload or navigation keeps the same webContents and asks again.
    if (!renderers.has(webContents)) {
      renderers.add(webContents);
      webContents.addListener('destroyed', () => {
        renderers.delete(webContents);
      });
    }

    return api.getState();
  });

  // Another 'destroyed' listener can dispatch before ours removes the renderer.
  const sendToRenderer = (
    webContents: WebContents,
    action: AnyAction
  ): void => {
    if (webContents.isDestroyed()) {
      renderers.delete(webContents);
      return;
    }
    invokeFromMain(webContents, 'redux/action-dispatched', action);
  };

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

  return (next) => (action) => {
    if (!isFSA(action)) {
      return next(action);
    }

    const locallyScoped = isLocallyScoped(action);
    if (locallyScoped) {
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
      const targets = [...renderers].filter(
        (w) =>
          w.id === webContentsId || (viewInstanceId && w.id === viewInstanceId)
      );
      targets.forEach((w) => sendToRenderer(w, rendererAction));
      return next(action);
    }
    renderers.forEach((webContents) => {
      sendToRenderer(webContents, rendererAction);
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

  return (next) => (action) => {
    if (!isFSA(action) || isLocallyScoped(action)) {
      return next(action);
    }

    invokeFromRenderer('redux/action-dispatched', action);
    return action;
  };
};
