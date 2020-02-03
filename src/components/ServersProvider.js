import React, { useEffect, createContext, useMemo, useContext } from 'react';
import { useDispatch } from 'react-redux';
import { call, put, takeEvery } from 'redux-saga/effects';
import { remote } from 'electron';
import { useTranslation } from 'react-i18next';

import {
	SERVERS_UPDATED,
	ADD_SERVER_VIEW_SERVER_ADDED,
	SIDE_BAR_SERVER_SELECTED,
	SIDE_BAR_REMOVE_SERVER_CLICKED,
	SIDE_BAR_SERVERS_SORTED,
	WEBVIEW_TITLE_CHANGED,
	WEBVIEW_FOCUS_REQUESTED,
	WEBVIEW_UNREAD_CHANGED,
	WEBVIEW_SIDEBAR_STYLE_CHANGED,
	MENU_BAR_SELECT_SERVER_CLICKED,
	TOUCH_BAR_SELECT_SERVER_TOUCHED,
	SIDE_BAR_ADD_NEW_SERVER_CLICKED,
	MENU_BAR_ADD_NEW_SERVER_CLICKED,
	WEBVIEW_DID_NAVIGATE,
	DEEP_LINK_TRIGGERED,
} from '../actions';
import servers from '../services/servers';
import { useSaga } from './SagaMiddlewareProvider';

const ServersContext = createContext();

export function ServersProvider({ children, service = servers }) {
	const servers = service;

	const dispatch = useDispatch();

	useEffect(() => {
		servers.setUp().then(() => {
			dispatch({
				type: SERVERS_UPDATED,
				payload: {
					servers: servers.all(),
					currentServerUrl: servers.getCurrentServerUrl(),
				},
			});
		});

		window.addEventListener('beforeunload', ::servers.tearDown);
		return ::servers.tearDown;
	}, [servers]);

	const { t } = useTranslation();

	useSaga(function *() {
		yield takeEvery(ADD_SERVER_VIEW_SERVER_ADDED, function *({ payload: url }) {
			servers.put({ url, title: url });
			servers.setCurrentServerUrl(url);

			yield put({
				type: SERVERS_UPDATED,
				payload: {
					servers: servers.all(),
					currentServerUrl: servers.getCurrentServerUrl(),
				},
			});
		});

		yield takeEvery(SIDE_BAR_SERVER_SELECTED, function *({ payload: url }) {
			servers.setCurrentServerUrl(url);
		});

		yield takeEvery(SIDE_BAR_REMOVE_SERVER_CLICKED, function *({ payload: url }) {
			servers.remove(url);

			yield put({
				type: SERVERS_UPDATED,
				payload: {
					servers: servers.all(),
					currentServerUrl: servers.getCurrentServerUrl(),
				},
			});
		});

		yield takeEvery(SIDE_BAR_SERVERS_SORTED, function *({ payload: url }) {
			servers.sort(url);
			yield put({
				type: SERVERS_UPDATED,
				payload: {
					servers: servers.all(),
					currentServerUrl: servers.getCurrentServerUrl(),
				},
			});
		});

		yield takeEvery(WEBVIEW_TITLE_CHANGED, function *({ payload: { url, title } }) {
			servers.put({ url, title: title || url });
			yield put({
				type: SERVERS_UPDATED,
				payload: {
					servers: servers.all(),
					currentServerUrl: servers.getCurrentServerUrl(),
				},
			});
		});

		yield takeEvery(WEBVIEW_FOCUS_REQUESTED, function *({ payload: { url } }) {
			servers.setCurrentServerUrl(url);
			yield put({
				type: SERVERS_UPDATED,
				payload: {
					servers: servers.all(),
					currentServerUrl: servers.getCurrentServerUrl(),
				},
			});
		});

		yield takeEvery(WEBVIEW_UNREAD_CHANGED, function *({ payload: { url, badge } }) {
			servers.put({ url, badge });
			yield put({
				type: SERVERS_UPDATED,
				payload: {
					servers: servers.all(),
					currentServerUrl: servers.getCurrentServerUrl(),
				},
			});
		});

		yield takeEvery(WEBVIEW_SIDEBAR_STYLE_CHANGED, function *({ payload: { url, style } }) {
			servers.put({ url, style });
			yield put({
				type: SERVERS_UPDATED,
				payload: {
					servers: servers.all(),
					currentServerUrl: servers.getCurrentServerUrl(),
				},
			});
		});

		yield takeEvery(MENU_BAR_SELECT_SERVER_CLICKED, function *({ payload: { url } }) {
			servers.setCurrentServerUrl(url);
			yield put({
				type: SERVERS_UPDATED,
				payload: {
					servers: servers.all(),
					currentServerUrl: servers.getCurrentServerUrl(),
				},
			});
		});

		yield takeEvery(TOUCH_BAR_SELECT_SERVER_TOUCHED, function *({ payload: url }) {
			servers.setCurrentServerUrl(url);
			yield put({
				type: SERVERS_UPDATED,
				payload: {
					servers: servers.all(),
					currentServerUrl: servers.getCurrentServerUrl(),
				},
			});
		});

		yield takeEvery(MENU_BAR_ADD_NEW_SERVER_CLICKED, function *() {
			servers.setCurrentServerUrl(null);
			yield put({
				type: SERVERS_UPDATED,
				payload: {
					servers: servers.all(),
					currentServerUrl: servers.getCurrentServerUrl(),
				},
			});
		});

		yield takeEvery(SIDE_BAR_ADD_NEW_SERVER_CLICKED, function *() {
			servers.setCurrentServerUrl(null);
			yield put({
				type: SERVERS_UPDATED,
				payload: {
					servers: servers.all(),
					currentServerUrl: servers.getCurrentServerUrl(),
				},
			});
		});

		yield takeEvery(WEBVIEW_DID_NAVIGATE, function *({ payload: { url, pageUrl } }) {
			if (pageUrl.includes(url)) {
				servers.put({ url, lastPath: pageUrl });
				yield put({
					type: SERVERS_UPDATED,
					payload: {
						servers: servers.all(),
						currentServerUrl: servers.getCurrentServerUrl(),
					},
				});
			}
		});

		yield takeEvery(DEEP_LINK_TRIGGERED, function *({ payload: { url } }) {
			if (servers.has(url)) {
				servers.setCurrentServerUrl(url);
				yield put({
					type: SERVERS_UPDATED,
					payload: {
						servers: servers.all(),
						currentServerUrl: servers.getCurrentServerUrl(),
					},
				});
				return;
			}

			const { response } = yield call(::remote.dialog.showMessageBox, {
				type: 'question',
				buttons: [t('dialog.addServer.add'), t('dialog.addServer.cancel')],
				defaultId: 0,
				title: t('dialog.addServer.title'),
				message: t('dialog.addServer.message', { host: url }),
			});

			if (response === 0) {
				try {
					yield call(::servers.validateHost(url));
					servers.put({ url, title: url });
					servers.setCurrentServerUrl(url);
					yield put({
						type: SERVERS_UPDATED,
						payload: {
							servers: servers.all(),
							currentServerUrl: servers.getCurrentServerUrl(),
						},
					});
				} catch (error) {
					remote.dialog.showErrorBox(t('dialog.addServerError.title'), t('dialog.addServerError.message', { host: url }));
				}

				yield put({
					type: SERVERS_UPDATED,
					payload: {
						servers: servers.all(),
						currentServerUrl: servers.getCurrentServerUrl(),
					},
				});
			}
		});
	}, [servers]);

	const validateHost = useMemo(() => ::servers.validateHost, [servers]);

	const value = useMemo(() => ({ validateHost }), [validateHost]);

	return <ServersContext.Provider children={children} value={value} />;
}

export const useServerValidation = () => useContext(ServersContext).validateHost;
