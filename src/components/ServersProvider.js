import React, { useEffect, createContext, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { put, takeEvery } from 'redux-saga/effects';

import {
	MENU_BAR_CLEAR_TRUSTED_CERTIFICATES_CLICKED,
	WEBVIEW_CERTIFICATE_TRUSTED,
	WEBVIEW_CERTIFICATE_DENIED,
	CERTIFICATES_CHANGED,
	SERVERS_UPDATED,
} from '../actions';
import servers from '../scripts/servers';
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
					currentServerUrl: servers.active,
				},
			});
		});

		window.addEventListener('beforeunload', ::servers.tearDown);
		return ::servers.tearDown;
	}, []);

	useSaga(function *() {
		yield takeEvery(MENU_BAR_CLEAR_TRUSTED_CERTIFICATES_CLICKED, function *() {
			servers.clear();
		});

		yield takeEvery(WEBVIEW_CERTIFICATE_TRUSTED, function *({ payload: { fingerprint } }) {
			servers.trust(fingerprint);
			yield put({ type: CERTIFICATES_CHANGED });
		});

		yield takeEvery(WEBVIEW_CERTIFICATE_DENIED, function *({ payload: { fingerprint } }) {
			servers.deny(fingerprint);
			yield put({ type: CERTIFICATES_CHANGED });
		});
	}, []);

	const value = useMemo(() => ({

	}), [servers]);

	return <ServersContext.Provider children={children} value={value} />;
}
