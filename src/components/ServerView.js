import React, { useState } from 'react';
import { takeEvery } from 'redux-saga/effects';

import {
	WEBVIEW_LOADING_STARTED,
	WEBVIEW_LOADING_DONE,
	WEBVIEW_LOADING_FAILED,
} from '../scripts/actions';
import { LoadingErrorView } from './LoadingErrorView';
import { WebUiView } from './WebUiView';
import { useSaga } from './SagaMiddlewareProvider';

export function ServerView({
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

		yield takeEvery(WEBVIEW_LOADING_FAILED, function *({ payload: { url: _url } }) {
			if (url !== _url) {
				return;
			}

			setReloading(false);
			setFailed(true);
		});
	}, [url]);

	return <>
		<WebUiView
			active={active}
			failed={failed}
			hasSidebar={hasSidebar}
			lastPath={lastPath}
			url={url}
		/>
		<LoadingErrorView
			reloading={reloading}
			url={url}
			visible={active && failed}
		/>
	</>;
}
