import querystring from 'querystring';
import url from 'url';

import { app, dialog } from 'electron';
import { t } from 'i18next';
import { all, fork, put, takeEvery, select, call } from 'redux-saga/effects';
import { createSelector } from 'reselect';

import {
	DEEP_LINK_TRIGGERED,
	DEEP_LINKS_SERVER_FOCUSED,
	DEEP_LINKS_SERVER_ADDED,
} from '../../actions';
import { preventedEventEmitterChannel } from '../channels';
import { selectServers } from '../selectors';
import { validateServerUrl, ValidationResult } from '../servers';

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

export function *deepLinksSaga(rootWindow) {
	const args = process.argv.slice(app.isPackaged ? 1 : 2);
	yield all(args.map((arg) => fork(processDeepLink, arg)));

	yield takeEvery(preventedEventEmitterChannel(app, 'open-url'), function *([, url]) {
		yield fork(processDeepLink, url);
	});

	yield takeEvery(preventedEventEmitterChannel(app, 'second-instance'), function *([, argv]) {
		const args = argv.slice(app.isPackaged ? 1 : 2);
		yield all(args.map((arg) => fork(processDeepLink, arg)));
	});

	yield takeEvery(DEEP_LINK_TRIGGERED, function *({ payload: { url } }) {
		const selectIsServerAlreadyAdded = createSelector(selectServers, (servers) => servers.some((server) => server.url === url));
		const isServerAlreadyAdded = yield select(selectIsServerAlreadyAdded);

		if (isServerAlreadyAdded) {
			yield put({ type: DEEP_LINKS_SERVER_FOCUSED, payload: url });
			return;
		}

		const { response } = yield call(dialog.showMessageBox, rootWindow, {
			type: 'question',
			buttons: [t('dialog.addServer.add'), t('dialog.addServer.cancel')],
			defaultId: 0,
			title: t('dialog.addServer.title'),
			message: t('dialog.addServer.message', { host: url }),
		});

		if (response === 0) {
			const result = yield call(validateServerUrl, url);

			if (result !== ValidationResult.OK) {
				dialog.showErrorBox(t('dialog.addServerError.title'), t('dialog.addServerError.message', { host: url }));
				return;
			}

			yield put({ type: DEEP_LINKS_SERVER_ADDED, payload: url });
		}
	});
}
