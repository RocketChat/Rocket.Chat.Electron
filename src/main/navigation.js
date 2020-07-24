import fs from 'fs';
import path from 'path';
import url from 'url';

import { app, shell } from 'electron';
import { call, put, race, select, take, takeEvery } from 'redux-saga/effects';

import {
	CERTIFICATE_TRUST_REQUESTED,
	CERTIFICATES_CLEARED,
	CERTIFICATES_CLIENT_CERTIFICATE_REQUESTED,
	CERTIFICATES_UPDATED,
	MENU_BAR_CLEAR_TRUSTED_CERTIFICATES_CLICKED,
	MENU_BAR_OPEN_URL_CLICKED,
	SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED,
	WEBVIEW_CERTIFICATE_DENIED,
	WEBVIEW_CERTIFICATE_TRUSTED,
	PERSISTABLE_VALUES_MERGED,
} from '../actions';
import { preventedEventEmitterChannel } from './channels';
import { selectServers, selectTrustedCertificates } from './selectors';

const loadUserTrustedCertificates = async () => {
	try {
		const filePath = path.join(app.getPath('userData'), 'certificate.json');
		const content = await fs.promises.readFile(filePath, 'utf8');
		const json = JSON.parse(content);
		await fs.promises.unlink(filePath);

		return json && typeof json === 'object' ? json : {};
	} catch (error) {
		return {};
	}
};

const serializeCertificate = (certificate) => `${ certificate.issuerName }\n${ certificate.data.toString() }`;

const queuedTrustRequests = new Map();

function *handleCertificateError([, webContents, requestedUrl, error, certificate, callback]) {
	const serialized = serializeCertificate(certificate);
	const { host } = url.parse(requestedUrl);

	const trustedCertificates = yield select(selectTrustedCertificates);

	const isTrusted = !!trustedCertificates[host] && trustedCertificates[host] === serialized;

	if (isTrusted) {
		callback(true);
		return;
	}

	if (queuedTrustRequests.has(certificate.fingerprint)) {
		queuedTrustRequests.get(certificate.fingerprint).push(callback);
		return;
	}

	queuedTrustRequests.set(certificate.fingerprint, [callback]);

	yield put({
		type: CERTIFICATE_TRUST_REQUESTED,
		payload: {
			webContentsId: webContents.id,
			requestedUrl,
			error,
			fingerprint: certificate.fingerprint,
			issuerName: certificate.issuerName,
			willBeReplaced: !!trustedCertificates[host],
		},
	});

	while (true) {
		const { type, payload: { fingerprint } } = (yield race([
			take(WEBVIEW_CERTIFICATE_TRUSTED),
			take(WEBVIEW_CERTIFICATE_DENIED),
		])).filter(Boolean)[0];

		const isTrustedByUser = type === WEBVIEW_CERTIFICATE_TRUSTED;

		queuedTrustRequests.get(fingerprint).forEach((cb) => cb(isTrustedByUser));
		queuedTrustRequests.delete(fingerprint);

		const trustedCertificates = yield select(selectTrustedCertificates);

		if (isTrustedByUser) {
			yield put({
				type: CERTIFICATES_UPDATED,
				payload: { ...trustedCertificates, [host]: serialized },
			});
		}
	}
}

const queuedClientCertificateRequests = new Map();

function *handleSelectClientCertificate([, , , certificateList, callback]) {
	const requestId = Math.random().toString(36).slice(2);
	queuedClientCertificateRequests.set(requestId, { certificateList, callback });

	certificateList = JSON.parse(JSON.stringify(certificateList));
	yield put({
		type: CERTIFICATES_CLIENT_CERTIFICATE_REQUESTED,
		payload: { requestId, certificateList },
	});
}

function *handleLogin([, , request, , callback]) {
	const servers = yield select(selectServers);

	for (const server of servers) {
		const { host: serverHost, auth } = url.parse(server.url);
		const requestHost = url.parse(request.url).host;

		if (serverHost !== requestHost || !auth) {
			callback();
			return;
		}

		const [username, password] = auth.split(/:/);
		callback(username, password);
	}
}

export function *watchEvents() {
	yield takeEvery(preventedEventEmitterChannel(app, 'login'), handleLogin);

	yield takeEvery(preventedEventEmitterChannel(app, 'certificate-error'), handleCertificateError);

	yield takeEvery(preventedEventEmitterChannel(app, 'select-client-certificate'), handleSelectClientCertificate);

	yield takeEvery(MENU_BAR_CLEAR_TRUSTED_CERTIFICATES_CLICKED, function *() {
		yield put({ type: CERTIFICATES_CLEARED });
	});

	yield takeEvery(SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED, function *({ payload }) {
		const { requestId, fingerprint } = payload;

		if (!queuedClientCertificateRequests.has(requestId)) {
			return;
		}

		const { certificateList, callback } = queuedClientCertificateRequests.get(requestId);
		const certificate = certificateList.find((certificate) => certificate.fingerprint === fingerprint);

		if (!certificate) {
			callback(null);
			return;
		}

		queuedClientCertificateRequests.delete(requestId);
		callback(certificate);
	});

	yield takeEvery(MENU_BAR_OPEN_URL_CLICKED, function *({ payload: url }) {
		shell.openExternal(url);
	});
}

export function *setupNavigation() {
	const trustedCertificates = yield select(selectTrustedCertificates);
	const userTrustedCertificates = yield call(loadUserTrustedCertificates);

	yield put({
		type: PERSISTABLE_VALUES_MERGED,
		payload: {
			trustedCertificates: {
				...trustedCertificates,
				...userTrustedCertificates,
			},
		},
	});

	yield *watchEvents();
}
