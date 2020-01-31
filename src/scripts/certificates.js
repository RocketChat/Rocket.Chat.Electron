import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import url from 'url';

import { remote } from 'electron';

import {
	CERTIFICATES_CHANGED,
	CERTIFICATE_TRUST_REQUESTED,
} from './actions';

const storageFileName = 'certificate.json';

const serializeCertificate = (certificate) => `${ certificate.issuerName }\n${ certificate.data.toString() }`;

export class Certificates extends EventEmitter {
	write = async (certificates) => {
		const storageFilePath = path.join(remote.app.getPath('userData'), storageFileName);
		await fs.promises.writeFile(storageFilePath, JSON.stringify(certificates), 'utf8');
	}

	read = async () => {
		try {
			const certificates = JSON.parse(await fs.promises.readFile(path.join(remote.app.getPath('userData'), storageFileName), 'utf8'));

			if (!certificates || typeof certificates !== 'object') {
				throw new TypeError();
			}

			return certificates;
		} catch (error) {
			console.error(error);
			return {};
		}
	}

	certificates = {};

	setUp = async () => {
		this.certificates = await this.read();
		await this.write(this.certificates);
	}

	queuedTrustRequests = new WeakMap();

	handleCertificateError = async (_, webContents, certificateUrl, error, certificate, callback) => {
		const serialized = serializeCertificate(certificate);

		const { host } = url.parse(certificateUrl);
		const isTrusted = this.certificates[host] && this.certificates[host] === serialized;

		if (isTrusted) {
			callback(true);
			return;
		}

		if (this.queuedTrustRequests.has(certificate.fingerprint)) {
			this.queuedTrustRequests.get(certificate.fingerprint).push(callback);
			return;
		}

		const commit = async (trusted) => {
			if (!trusted) {
				return;
			}

			this.certificates = { ...this.certificates, [host]: serialized };
			this.write(this.certificates);
			this.emit(CERTIFICATES_CHANGED);
		};

		this.queuedTrustRequests.set(certificate.fingerprint, [commit, callback]);

		this.emit(CERTIFICATE_TRUST_REQUESTED, {
			webContentsId: webContents.id,
			url: certificateUrl,
			error,
			fingerprint: certificate.fingerprint,
			issuerName: certificate.issuerName,
			willBeReplaced: !!this.certificates[host],
		});
	}

	trust = (fingerprint) => {
		this.queuedTrustRequests.get(fingerprint).forEach((cb) => cb(true));
		this.queuedTrustRequests.delete(fingerprint);
	}

	deny = (fingerprint) => {
		this.queuedTrustRequests.get(fingerprint).forEach((cb) => cb(false));
		this.queuedTrustRequests.delete(fingerprint);
	}

	clear = () => {
		this.certificates = {};
		this.write(this.certificates);
	}
}
