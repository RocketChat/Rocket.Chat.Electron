import { WebContents, ipcMain, ipcRenderer } from 'electron';
import { Middleware, MiddlewareAPI, Dispatch, AnyAction } from 'redux';

import { isFSA, FluxStandardAction } from './structs/fsa';

export const EVENT_EDIT_FLAGS_CHANGED = 'event/edit-flags-changed';
export const QUERY_SPELL_CHECKING_LANGUAGE = 'query/spell-checking-language';
export const EVENT_SPELL_CHECKING_LANGUAGE_CHANGED = 'event/spell-checking-language-changed';
export const QUERY_MISSPELT_WORDS = 'query/misspelt-words';
export const EVENT_SERVER_BADGE_CHANGED = 'event/server-badge-changed';
export const EVENT_SERVER_FAVICON_CHANGED = 'event/server-favicon-changed';
export const EVENT_SERVER_SIDEBAR_STYLE_CHANGED = 'event/server-sidebar-style-changed';
export const EVENT_SIDEBAR_HIDDEN = 'event/sidebar-hidden';
export const EVENT_SIDEBAR_VISIBLE = 'event/sidebar-visible';
export const EVENT_SERVER_TITLE_CHANGED = 'event/server-title-changed';
export const EVENT_SYSTEM_SUSPENDING = 'event/system-suspending';
export const EVENT_SYSTEM_LOCKING_SCREEN = 'event/system-locking-screen';
export const QUERY_SYSTEM_IDLE_STATE = 'query/system-idle-state';
export const EVENT_MESSAGE_BOX_FOCUSED = 'event/message-box-focused';
export const EVENT_MESSAGE_BOX_BLURRED = 'event/message-box-blurred';
export const EVENT_FORMAT_BUTTON_TOUCHED = 'event/format-button-touched';
export const QUERY_NEW_NOTIFICATION = 'query/new-notification';
export const EVENT_NOTIFICATION_CLOSING = 'event/notification-closing';
export const EVENT_NOTIFICATION_SHOWN = 'event/notification-shown';
export const EVENT_NOTIFICATION_CLOSED = 'event/notification-closed';
export const EVENT_NOTIFICATION_CLICKED = 'event/notification-clicked';
export const EVENT_NOTIFICATION_REPLIED = 'event/notification-replied';
export const EVENT_NOTIFICATION_ACTIONED = 'event/notification-actioned';
export const EVENT_SERVER_FOCUSED = 'event/server-focused';
export const EVENT_BROWSER_VIEW_CONTEXT_MENU_TRIGGERED = 'event/browser-view-context-menu-triggered';
export const EVENT_WEB_CONTENTS_FOCUS_CHANGED = 'event/web-contents-focus-changed';
export const QUERY_I18N_PARAMS = 'query/i18n-params';
export const EVENT_BROWSER_VIEW_ATTACHED = 'event/browser-view-attached';

enum ReduxIpcChannel {
	GET_INITIAL_STATE = 'redux/get-initial-state',
	ACTION_DISPATCHED = 'redux/action-dispatched',
}

enum ActionScope {
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

	return (next: Dispatch) => (action: AnyAction) => {
		if (!isFSA(action)) {
			return next(action);
		}

		if (action.meta && action.meta.scope === ActionScope.LOCAL) {
			return next(action);
		}

		const rendererAction: FluxStandardAction<unknown> = {
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

	return (next: Dispatch) => (action: AnyAction) => {
		if (!isFSA(action)) {
			return next(action);
		}

		if (action.meta && action.meta.scope === ActionScope.LOCAL) {
			return next(action);
		}

		ipcRenderer.send(ReduxIpcChannel.ACTION_DISPATCHED, action);
	};
};
