import querystring from 'querystring';
import url from 'url';

import { remote } from 'electron';
import { all, fork, put, takeEvery } from 'redux-saga/effects';

import { DEEP_LINK_TRIGGERED } from '../actions';
import { createEventChannelFromEmitter } from '../sagaUtils';

const normalizeUrl = (hostUrl, insecure = false) => {
	if (!/^https?:\/\//.test(hostUrl)) {
		return `${ insecure ? 'http' : 'https' }://${ hostUrl }`;
	}

	return hostUrl;
};

function *processAuth({ host, token, userId, insecure }) {
	const url = normalizeUrl(host, insecure === 'true');
	yield put({ type: DEEP_LINK_TRIGGERED, payload: { type: 'auth', url, token, userId } });
}

function *processRoom({ host, rid, path, insecure }) {
	const url = normalizeUrl(host, insecure === 'true');
	yield put({ type: DEEP_LINK_TRIGGERED, payload: { type: 'room', url, rid, path } });
}

function *processDeepLink(link) {
	const { protocol, hostname:	action, query } = url.parse(link);

	if (protocol !== 'rocketchat:') {
		return;
	}

	switch (action) {
		case 'auth': {
			yield *processAuth(querystring.parse(query));
			break;
		}

		case 'room': {
			yield *processRoom(querystring.parse(query));
			break;
		}
	}
}

function *takeAppEvents() {
	const openUrlChannel = createEventChannelFromEmitter(remote.app, 'open-url');
	const secondInstanceChannel = createEventChannelFromEmitter(remote.app, 'second-instance');

	yield takeEvery(openUrlChannel, function *([, url]) {
		yield fork(processDeepLink, url);
	});

	yield takeEvery(secondInstanceChannel, function *([, argv]) {
		const args = argv.slice(remote.app.isPackaged ? 1 : 2);
		yield all(args.map((arg) => fork(processDeepLink, arg)));
	});
}

export function *deepLinksSaga() {
	yield *takeAppEvents();
	const args = remote.process.argv.slice(remote.app.isPackaged ? 1 : 2);
	yield all(args.map((arg) => fork(processDeepLink, arg)));
}
