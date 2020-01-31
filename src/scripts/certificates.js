import fs from 'fs';
import path from 'path';
import url from 'url';

import { remote } from 'electron';

import { dispatch, subscribe } from './effects';
import {
	CERTIFICATES_CHANGED,
	CERTIFICATE_TRUST_REQUESTED,
	MENU_BAR_CLEAR_TRUSTED_CERTIFICATES_CLICKED,
	WEBVIEW_CERTIFICATE_TRUSTED,
	WEBVIEW_CERTIFICATE_DENIED,
} from './actions';

const storageFileName = 'certificate.json';
let certificates = {};
const queuedTrustRequests = new WeakMap();

const updateCertificates = async (newCertificates) => {
	certificates = newCertificates;
	await fs.promises.writeFile(path.join(remote.app.getPath('userData'), storageFileName), JSON.stringify(certificates), 'utf8');
};

const fetchCertificates = async () => {
	try {
		const certificates = JSON.parse(await fs.promises.readFile(path.join(remote.app.getPath('userData'), storageFileName), 'utf8'));

		if (!certificates || typeof certificates !== 'object') {
			updateCertificates({});
		} else {
			updateCertificates(certificates);
		}
	} catch (error) {
		console.error(error);
		updateCertificates({});
	}
};

const serializeCertificate = (certificate) => `${ certificate.issuerName }\n${ certificate.data.toString() }`;

const	handleCertificateError = async (_, webContents, certificateUrl, error, certificate, callback) => {
	const serialized = serializeCertificate(certificate);

	const { host } = url.parse(certificateUrl);
	const isTrusted = certificates[host] && certificates[host] === serialized;

	if (isTrusted) {
		callback(true);
		return;
	}

	if (queuedTrustRequests.has(certificate.fingerprint)) {
		queuedTrustRequests.get(certificate.fingerprint).push(callback);
		return;
	}

	const commit = async (trusted) => {
		if (!trusted) {
			return;
		}

		updateCertificates({ ...certificates, [host]: serialized });
		dispatch({ type: CERTIFICATES_CHANGED });
	};

	queuedTrustRequests.set(certificate.fingerprint, [commit, callback]);

	dispatch({
		type: CERTIFICATE_TRUST_REQUESTED,
		payload: {
			webContentsId: webContents.id,
			url: certificateUrl,
			error,
			fingerprint: certificate.fingerprint,
			issuerName: certificate.issuerName,
			willBeReplaced: !!certificates[host],
		},
	});
};

const handleActionDispatched = ({ type, payload }) => {
	switch (type) {
		case MENU_BAR_CLEAR_TRUSTED_CERTIFICATES_CLICKED: {
			updateCertificates({});
			break;
		}

		case WEBVIEW_CERTIFICATE_TRUSTED: {
			const { fingerprint } = payload;
			queuedTrustRequests.get(fingerprint).forEach((cb) => cb(true));
			queuedTrustRequests.delete(fingerprint);
			break;
		}

		case WEBVIEW_CERTIFICATE_DENIED: {
			const { fingerprint } = payload;
			queuedTrustRequests.get(fingerprint).forEach((cb) => cb(false));
			queuedTrustRequests.delete(fingerprint);
			break;
		}
	}
};

// TODO: configure it on webviews only
export const setupCertificates = async () => {
	await fetchCertificates();

	subscribe(handleActionDispatched);

	remote.app.on('certificate-error', handleCertificateError);

	window.addEventListener('unload', () => {
		remote.app.removeListener('certificate-error', handleCertificateError);
	});
};
