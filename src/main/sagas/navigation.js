import url from 'url';

import { app, shell } from 'electron';
import { takeEvery, select, put, race, take, call } from 'redux-saga/effects';

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
} from '../../actions';
import { preventedEventEmitterChannel } from '../channels';
import { selectServers, selectTrustedCertificates, selectPersistableValues } from '../selectors';
import { readConfigurationFile } from '../fileSystemStorage';

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

export const migrateTrustedCertificates = async (persistedValues) => {
	const userTrustedCertificates = await readConfigurationFile('certificate.json', { appData: false, purgeAfter: true });

	if (!userTrustedCertificates || typeof userTrustedCertificates !== 'object') {
		return;
	}

	Object.assign(persistedValues.trustedCertificates, userTrustedCertificates);
};

export function *takeEveryForNavigation() {
	yield takeEvery(preventedEventEmitterChannel(app, 'login'), handleLogin);

	yield takeEvery(preventedEventEmitterChannel(app, 'certificate-error'), handleCertificateError);

	yield takeEvery(preventedEventEmitterChannel(app, 'select-client-certificate'), handleSelectClientCertificate);

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
		shell.openExternal(url);
	});
}

export function *loadNavigationConfiguration() {
	const persistedValues = { ...yield select(selectPersistableValues) };
	yield call(migrateTrustedCertificates, persistedValues);
	yield put({ type: PERSISTABLE_VALUES_MERGED, payload: persistedValues });
}
