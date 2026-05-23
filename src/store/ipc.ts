import type { WebContents } from 'electron';
import type { Middleware, MiddlewareAPI } from 'redux';

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

const shouldLogTelephonyServerSelect = (action: { type?: unknown }): boolean =>
  action.type === 'telephony-server-select/open' ||
  action.type === 'telephony-server-select/close';

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

  return (next) => (action) => {
    if (!isFSA(action)) {
      return next(action);
    }

    const locallyScoped = isLocallyScoped(action);
    if (shouldLogTelephonyServerSelect(action)) {
      console.error(
        '[MOSDAT-DIAG] forwardToRenderers received',
        JSON.stringify({
          locallyScoped,
          rendererCount: renderers.size,
          singleScoped: isSingleScoped(action),
          type: action.type,
        })
      );
    }

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
      if (shouldLogTelephonyServerSelect(action)) {
        console.error(
          '[MOSDAT-DIAG] forwardToRenderers single-scope targets',
          JSON.stringify({
            targetIds: targets.map((w) => w.id),
            type: action.type,
          })
        );
      }
      targets.forEach((w) =>
        invokeFromMain(w, 'redux/action-dispatched', rendererAction)
      );
      return next(action);
    }
    if (shouldLogTelephonyServerSelect(action)) {
      console.error(
        '[MOSDAT-DIAG] forwardToRenderers broadcast',
        JSON.stringify({
          rendererIds: [...renderers].map((w) => w.id),
          type: action.type,
        })
      );
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

  return (next) => (action) => {
    if (!isFSA(action) || isLocallyScoped(action)) {
      return next(action);
    }

    invokeFromRenderer('redux/action-dispatched', action);
    return action;
  };
};
