import url from 'url';

import { remote } from 'electron';
import jetpack from 'fs-jetpack';
import { t } from 'i18next';

const { app, dialog } = remote;

class CertificateStore {
	async initialize() {
		this.storeFileName = 'certificate.json';
		this.userDataDir = jetpack.cwd(app.getPath('userData'));

		await this.load();

		// Don't ask twice for same cert if loading multiple urls
		this.queued = {};

		app.on('certificate-error', async (event, webContents, certificateUrl, error, certificate, callback) => {
			if (this.isTrusted(certificateUrl, certificate)) {
				callback(true);
				return;
			}

			if (this.queued[certificate.fingerprint]) {
				this.queued[certificate.fingerprint].push(callback);
				return;
			}
			this.queued[certificate.fingerprint] = [callback];


			let detail = `URL: ${ certificateUrl }\nError: ${ error }`;
			if (this.isExisting(certificateUrl)) {
				detail = t('error.differentCertificate', { detail });
			}

			const { response } = await dialog.showMessageBox(remote.getCurrentWindow(), {
				title: t('dialog.certificateError.title'),
				message: t('dialog.certificateError.message', { issuerName: certificate.issuerName }),
				detail,
				type: 'warning',
				buttons: [
					t('dialog.certificateError.yes'),
					t('dialog.certificateError.no'),
				],
				cancelId: 1,
			});

			if (response === 0) {
				this.add(certificateUrl, certificate);
				await this.save();
				if (webContents.getURL().indexOf('file://') === 0) {
					webContents.send('certificate-reload', certificateUrl);
				}
			}

			this.queued[certificate.fingerprint].forEach((cb) => cb(response === 0));
			delete this.queued[certificate.fingerprint];
		});
	}

	async load() {
		try {
			this.data = await this.userDataDir.readAsync(this.storeFileName, 'json');
		} catch (e) {
			console.error(e);
			this.data = {};
		}

		if (this.data === undefined) {
			await this.clear();
		}
	}

	async clear() {
		this.data = {};
		await this.save();
	}

	async save() {
		await this.userDataDir.writeAsync(this.storeFileName, this.data, { atomic: true });
	}

	parseCertificate(certificate) {
		return `${ certificate.issuerName }\n${ certificate.data.toString() }`;
	}

	getHost(certificateUrl) {
		return url.parse(certificateUrl).host;
	}

	add(certificateUrl, certificate) {
		const host = this.getHost(certificateUrl);
		this.data[host] = this.parseCertificate(certificate);
	}

	isExisting(certificateUrl) {
		const host = this.getHost(certificateUrl);
		return this.data.hasOwnProperty(host);
	}

	isTrusted(certificateUrl, certificate) {
		const host = this.getHost(certificateUrl);
		if (!this.isExisting(certificateUrl)) {
			return false;
		}
		return this.data[host] === this.parseCertificate(certificate);
	}
}

const instance = new CertificateStore();

export default instance;
