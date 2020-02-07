import React, { useState } from 'react';
import { takeEvery } from 'redux-saga/effects';

import {
	WEBVIEW_LOADING_STARTED,
	WEBVIEW_LOADING_DONE,
	WEBVIEW_LOADING_FAILED,
	WEBVIEW_CERTIFICATE_DENIED,
} from '../../actions';
import { LoadingError } from './LoadingError';
import { WebViewPane } from './WebViewPane';
import { useSaga } from '../SagaMiddlewareProvider';

export function ServerPane({
	active = false,
	hasSidebar = false,
	lastPath,
	url,
}) {
	const [reloading, setReloading] = useState(false);
	const [failed, setFailed] = useState(false);

	useSaga(function *() {
		yield takeEvery(WEBVIEW_LOADING_STARTED, function *({ payload: { url: _url } }) {
			if (url !== _url) {
				return;
			}

			setReloading(true);
			setFailed(false);
		});

		yield takeEvery(WEBVIEW_LOADING_DONE, function *({ payload: { url: _url } }) {
			if (url !== _url) {
				return;
			}

			setReloading(false);
			setFailed(false);
		});

		yield takeEvery([WEBVIEW_LOADING_FAILED, WEBVIEW_CERTIFICATE_DENIED], function *({ payload: { url: _url } }) {
			if (url !== _url) {
				return;
			}

			setReloading(false);
			setFailed(true);
		});
	}, [url]);

	return <>
		<WebViewPane
			active={active}
			failed={failed}
			hasSidebar={hasSidebar}
			lastPath={lastPath}
			url={url}
		/>
		<LoadingError
			reloading={reloading}
			url={url}
			visible={active && failed}
		/>
	</>;
}
