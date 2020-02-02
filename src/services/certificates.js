import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import url from 'url';

import { remote } from 'electron';

import { readMap, writeMap } from '../localStorage';

const emitter = new EventEmitter();

let trustedCertificates = new Map();

const setUp = async () => {
	trustedCertificates = readMap('trustedCertificates');

	try {
		const certificatesFilePath = path.join(remote.app.getPath('userData'), 'certificate.json');

		if (await fs.promises.stat(certificatesFilePath).then((stat) => stat.isFile(), () => false)) {
			const mapping = JSON.parse(await fs.promises.readFile(certificatesFilePath, 'utf8'));

			for (const [key, value] of Object.entries(mapping)) {
				trustedCertificates.set(key, String(value));
			}

			await fs.promises.unlink(certificatesFilePath);
		}
	} catch (error) {
		console.error(error.stack);
	}
};

const tearDown = () => {
	emitter.removeAllListeners();
	trustedCertificates.clear();
};

const clear = () => {
	trustedCertificates.clear();
	writeMap('trustedCertificates', trustedCertificates);
};

const queuedTrustRequests = new Map();

const trust = (fingerprint) => {
	queuedTrustRequests.get(fingerprint).forEach((cb) => cb(true));
	queuedTrustRequests.delete(fingerprint);
};

const deny = (fingerprint) => {
	queuedTrustRequests.get(fingerprint).forEach((cb) => cb(false));
	queuedTrustRequests.delete(fingerprint);
};

const serializeCertificate = (certificate) => `${ certificate.issuerName }\n${ certificate.data.toString() }`;

const TRUST_REQUESTED_EVENT = 'trust-requested';

const handleCertificateError = async (webContents, requestedUrl, error, certificate, callback) => {
	const serialized = serializeCertificate(certificate);
	const { host } = url.parse(requestedUrl);

	const isTrusted = trustedCertificates.has(host) && trustedCertificates.get(host) === serialized;

	if (isTrusted) {
		callback(true);
		return;
	}

	if (queuedTrustRequests.has(certificate.fingerprint)) {
		queuedTrustRequests.get(certificate.fingerprint).push(callback);
		return;
	}

	const commit = (trusted) => {
		if (!trusted) {
			return;
		}

		trustedCertificates.set(host, serialized);
		writeMap('trustedCertificates', trustedCertificates);
	};

	queuedTrustRequests.set(certificate.fingerprint, [commit, callback]);

	emitter.emit(TRUST_REQUESTED_EVENT, {
		webContentsId: webContents.id,
		requestedUrl,
		error,
		fingerprint: certificate.fingerprint,
		issuerName: certificate.issuerName,
		willBeReplaced: trustedCertificates.has(host),
	});
};

export default Object.seal(Object.assign(emitter, {
	setUp,
	tearDown,
	clear,
	trust,
	deny,
	handleCertificateError,
	constants: Object.freeze({
		TRUST_REQUESTED_EVENT,
	}),
}));
