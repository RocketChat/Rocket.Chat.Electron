import fs from 'fs';
import path from 'path';
import url from 'url';

import { app, shell } from 'electron';
import { takeEvery, select, put, race, take, call } from 'redux-saga/effects';

import { preventedEventEmitterChannel } from '../channels';
import { selectServers, selectTrustedCertificates } from '../selectors';
import {
	CERTIFICATE_TRUST_REQUESTED,
	WEBVIEW_CERTIFICATE_TRUSTED,
	WEBVIEW_CERTIFICATE_DENIED,
	CERTIFICATES_UPDATED,
	CERTIFICATES_CLIENT_CERTIFICATE_REQUESTED,
	MENU_BAR_CLEAR_TRUSTED_CERTIFICATES_CLICKED,
	CERTIFICATES_CLEARED,
	SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED,
	MENU_BAR_OPEN_URL_CLICKED,
	CERTIFICATES_READY,
} from '../../actions';
import { readFromStorage } from '../localStorage';

const getConfigurationPath = (filePath, { appData = true } = {}) => path.join(
	...appData ? [
		app.getAppPath(),
		app.getAppPath().endsWith('app.asar') ? '..' : '.',
	] : [app.getPath('userData')],
	filePath,
);

const readConfigurationFile = async (filePath, {
	appData = true,
	purgeAfter = false,
} = {}) => {
	try {
		const configurationFilePath = getConfigurationPath(filePath, { appData });

		if (!await fs.promises.stat(filePath).then((stat) => stat.isFile(), () => false)) {
			return null;
		}

		const content = JSON.parse(await fs.promises.readFile(configurationFilePath, 'utf8'));

		if (!appData && purgeAfter) {
			await fs.promises.unlink(configurationFilePath);
		}

		return content;
	} catch (error) {
		console.warn(error);
		return null;
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

function *loadTrustedCertificates(rootWindow) {
	const trustedCertificates = yield select(({ trustedCertificates }) => trustedCertificates);

	yield call(loadUserTrustedCertificates, trustedCertificates);

	Object.assign(trustedCertificates, yield call(readFromStorage, rootWindow, 'trustedCertificates', {}));

	return trustedCertificates;
}

export function *navigationSaga(rootWindow) {
	const trustedCertificates = yield call(loadTrustedCertificates, rootWindow);

	yield put({
		type: CERTIFICATES_READY,
		payload: trustedCertificates,
	});

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
