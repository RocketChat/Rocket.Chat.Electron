import querystring from 'querystring';
import url from 'url';

import { remote } from 'electron';
import { eventChannel } from 'redux-saga';
import { all, fork, put, takeEvery } from 'redux-saga/effects';

import { DEEP_LINK_TRIGGERED } from '../actions';

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
	const createAppChannel = (app, eventName) => eventChannel((emit) => {
		const listener = (...args) => emit(args);

		const cleanUp = () => {
			app.removeListener(eventName, listener);
			window.removeEventListener('beforeunload', cleanUp);
		};

		app.addListener(eventName, listener);
		window.addEventListener('beforeunload', cleanUp);

		return cleanUp;
	});

	const openUrlChannel = createAppChannel(remote.app, 'open-url');
	const secondInstanceChannel = createAppChannel(remote.app, 'second-instance');

	yield takeEvery(openUrlChannel, function *([, url]) {
		yield fork(processDeepLink, url);
	});

	yield takeEvery(secondInstanceChannel, function *([, argv]) {
		yield all(argv.slice(2).map((arg) => fork(processDeepLink, arg)));
	});
}

export function *deepLinksSaga() {
	yield *takeAppEvents();
	yield all(remote.process.argv.slice(2).map((arg) => fork(processDeepLink, arg)));
}
