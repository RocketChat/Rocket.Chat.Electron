import querystring from 'querystring';
import url from 'url';

import { all, fork, put, takeEvery } from 'redux-saga/effects';
import { app } from 'electron';

import { DEEP_LINK_TRIGGERED } from '../../actions';
import { eventEmitterChannel } from '../channels';

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

const preventDefaultDecorator = (listener) =>
	(event, ...args) => {
		event.preventDefault();
		listener([event, ...args]);
	};

export function *deepLinksSaga() {
	yield takeEvery(eventEmitterChannel(app, 'open-url', preventDefaultDecorator), function *([, url]) {
		yield fork(processDeepLink, url);
	});

	yield takeEvery(eventEmitterChannel(app, 'second-instance', preventDefaultDecorator), function *([, argv]) {
		const args = argv.slice(app.isPackaged ? 1 : 2);
		yield all(args.map((arg) => fork(processDeepLink, arg)));
	});

	const args = process.argv.slice(app.isPackaged ? 1 : 2);
	yield all(args.map((arg) => fork(processDeepLink, arg)));
}
