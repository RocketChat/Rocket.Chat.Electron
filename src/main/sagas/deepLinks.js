import querystring from 'querystring';
import url from 'url';

import { app } from 'electron';
import { all, call, fork, put, select, takeEvery } from 'redux-saga/effects';

import {
	DEEP_LINK_TRIGGERED,
	DEEP_LINKS_SERVER_FOCUSED,
	DEEP_LINKS_SERVER_ADDED,
} from '../../actions';
import { preventedEventEmitterChannel } from '../channels';
import { askForServerAddition, warnAboutInvalidServerUrl } from '../dialogs';
import { normalizeServerUrl, getServerInfo } from '../servers';

const isRocketChatUrl = (parsedUrl) =>
	parsedUrl.protocol === 'rocketchat:';

const isGoRocketChatUrl = (parsedUrl) =>
	parsedUrl.protocol === 'https:' && parsedUrl.hostname === 'go.rocket.chat';

const parseDeepLink = (deepLink) => {
	const parsedUrl = url.parse(deepLink);

	if (isRocketChatUrl(parsedUrl)) {
		const action = parsedUrl.hostname;
		const args = querystring.parse(parsedUrl.query);
		return { action, args };
	}

	if (isGoRocketChatUrl(parsedUrl)) {
		const action = parsedUrl.pathname;
		const args = querystring.parse(parsedUrl.query);
		return { action, args };
	}

	return null;
};

function *authenticateFromDeepLink(/* token, userId */) {
	throw Error('unimplemented');
}

function *requestOpenRoom(/* rid, path */) {
	throw Error('unimplemented');
}

function *performAuthentication(rootWindow, { host, token, userId }) {
	const serverUrl = normalizeServerUrl(host);
	if (!serverUrl) {
		return;
	}

	const isServerAdded = yield select(({ servers }) => servers.some((server) => server.url === serverUrl));

	if (isServerAdded) {
		yield put({ type: DEEP_LINKS_SERVER_FOCUSED, payload: serverUrl });
		yield call(authenticateFromDeepLink, token, userId);
		return;
	}

	const permitted = yield call(askForServerAddition, rootWindow, serverUrl);

	if (!permitted) {
		return;
	}

	const { server, error } = yield call(getServerInfo, serverUrl);

	if (error) {
		yield call(warnAboutInvalidServerUrl, rootWindow, serverUrl, error);
	}

	yield put({ type: DEEP_LINKS_SERVER_ADDED, payload: server });
	yield put({ type: DEEP_LINKS_SERVER_FOCUSED, payload: serverUrl });
	yield call(authenticateFromDeepLink, token, userId);
}

function *performOpenRoom(rootWindow, { host, rid, path }) {
	const serverUrl = normalizeServerUrl(host);
	if (!serverUrl) {
		return;
	}

	const isServerAdded = yield select(({ servers }) => servers.some((server) => server.url === serverUrl));

	if (isServerAdded) {
		yield put({ type: DEEP_LINKS_SERVER_FOCUSED, payload: serverUrl });
		yield call(requestOpenRoom, rid, path);
		return;
	}

	const permitted = yield call(askForServerAddition, rootWindow, serverUrl);

	if (!permitted) {
		return;
	}

	const { server, error } = yield call(getServerInfo, serverUrl);

	if (error) {
		yield call(warnAboutInvalidServerUrl, rootWindow, serverUrl, error);
	}

	yield put({ type: DEEP_LINKS_SERVER_ADDED, payload: server });
	yield put({ type: DEEP_LINKS_SERVER_FOCUSED, payload: serverUrl });
	yield call(requestOpenRoom, rid, path);
}

function *processDeepLink(rootWindow, deepLink) {
	yield put({ type: DEEP_LINK_TRIGGERED });

	const parsedDeepLink = parseDeepLink(deepLink);

	if (!parsedDeepLink) {
		return;
	}

	const { action, args } = parsedDeepLink;

	switch (action) {
		case 'auth': {
			yield call(performAuthentication, rootWindow, args);
			break;
		}

		case 'room': {
			yield call(performOpenRoom, rootWindow, args);
			break;
		}
	}
}

export function *deepLinksSaga(rootWindow) {
	const args = process.argv.slice(app.isPackaged ? 1 : 2);
	yield all(args.map((arg) => fork(processDeepLink, rootWindow, arg)));

	yield takeEvery(preventedEventEmitterChannel(app, 'open-url'), function *([, url]) {
		yield fork(processDeepLink, rootWindow, url);
	});

	yield takeEvery(preventedEventEmitterChannel(app, 'second-instance'), function *([, argv]) {
		const args = argv.slice(app.isPackaged ? 1 : 2);
		yield all(args.map((arg) => fork(processDeepLink, rootWindow, arg)));
	});
}
