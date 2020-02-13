import url from 'url';

import { remote } from 'electron';
import { call, put, race, select, take, takeEvery } from 'redux-saga/effects';

import {
	CERTIFICATE_TRUST_REQUESTED,
	CERTIFICATES_CLEARED,
	CERTIFICATES_CLIENT_CERTIFICATE_REQUESTED,
	CERTIFICATES_READY,
	CERTIFICATES_UPDATED,
	MENU_BAR_CLEAR_TRUSTED_CERTIFICATES_CLICKED,
	SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED,
	WEBVIEW_CERTIFICATE_DENIED,
	WEBVIEW_CERTIFICATE_TRUSTED,
	MENU_BAR_OPEN_URL_CLICKED,
} from '../actions';
import { readFromStorage } from '../localStorage';
import { createEventChannelFromEmitter, keepStoreValuePersisted, readConfigurationFile } from '../sagaUtils';

const loadUserTrustedCertificates = async (trustedCertificates) => {
	const userTrustedCertificates = await readConfigurationFile('certificate.json', { appData: false, purgeAfter: true });

	if (!userTrustedCertificates) {
		return;
	}

	try {
		for (const [host, certificate] of Object.entries(userTrustedCertificates)) {
			trustedCertificates[host] = certificate;
		}
	} catch (error) {
		console.warn(error);
	}
};

function *loadTrustedCertificates() {
	const trustedCertificates = yield select(({ trustedCertificates }) => trustedCertificates);

	yield call(loadUserTrustedCertificates, trustedCertificates);

	Object.assign(trustedCertificates, readFromStorage('trustedCertificates', {}));

	return trustedCertificates;
}

function *handleLogin([, , request, , callback]) {
	const servers = yield select(({ servers }) => servers);

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

const serializeCertificate = (certificate) => `${ certificate.issuerName }\n${ certificate.data.toString() }`;

const queuedTrustRequests = new Map();

function *handleCertificateError([, webContents, requestedUrl, error, certificate, callback]) {
	const serialized = serializeCertificate(certificate);
	const { host } = url.parse(requestedUrl);

	const trustedCertificates = yield select(({ trustedCertificates }) => trustedCertificates);

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

		const trustedCertificates = yield select(({ trustedCertificates }) => trustedCertificates);

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
	yield put({ type: CERTIFICATES_CLIENT_CERTIFICATE_REQUESTED, payload: { requestId, certificateList } });
}

function *takeAppEvents() {
	const loginChannel = createEventChannelFromEmitter(remote.app, 'login');
	const certificateErrorChannel = createEventChannelFromEmitter(remote.app, 'certificate-error');
	const selectClientCertificateChannel = createEventChannelFromEmitter(remote.app, 'select-client-certificate');

	yield takeEvery(loginChannel, handleLogin);
	yield takeEvery(certificateErrorChannel, handleCertificateError);
	yield takeEvery(selectClientCertificateChannel, handleSelectClientCertificate);
}

function *takeActions() {
	yield takeEvery(MENU_BAR_CLEAR_TRUSTED_CERTIFICATES_CLICKED, function *() {
		yield put({ type: CERTIFICATES_CLEARED });
	});

	yield takeEvery(SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED, function *({ payload: { requestId, fingerprint } }) {
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
		remote.shell.openExternal(url);
	});
}

export function *navigationEventsSaga() {
	const trustedCertificates = yield *loadTrustedCertificates();

	yield *keepStoreValuePersisted('trustedCertificates');

	yield put({
		type: CERTIFICATES_READY,
		payload: trustedCertificates,
	});

	yield *takeAppEvents();
	yield *takeActions();
}
