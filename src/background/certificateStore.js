import { app, dialog } from 'electron';
import jetpack from 'fs-jetpack';
import url from 'url';
import { getMainWindow } from './mainWindow';
import i18n from '../i18n';


class CertificateStore {
	async initialize() {
		this.storeFileName = 'certificate.json';
		this.userDataDir = jetpack.cwd(app.getPath('userData'));

		await this.load();

		// Don't ask twice for same cert if loading multiple urls
		this.queued = {};

		app.on('certificate-error', async(event, webContents, certificateUrl, error, certificate, callback) => {
			event.preventDefault();

			if (this.isTrusted(certificateUrl, certificate)) {
				callback(true);
				return;
			}

			if (this.queued[certificate.fingerprint]) {
				this.queued[certificate.fingerprint].push(callback);
				return;
			} else {
				this.queued[certificate.fingerprint] = [callback];
			}

			let detail = `URL: ${ certificateUrl }\nError: ${ error }`;
			if (this.isExisting(certificateUrl)) {
				detail = i18n.__('error.differentCertificate', { detail });
			}

			dialog.showMessageBox(await getMainWindow(), {
				title: i18n.__('dialog.certificateError.title'),
				message: i18n.__('dialog.certificateError.message', { issuerName: certificate.issuerName }),
				detail,
				type: 'warning',
				buttons: [
					i18n.__('dialog.certificateError.yes'),
					i18n.__('dialog.certificateError.no'),
				],
				cancelId: 1,
			}, async(response) => {
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

app.once('start', instance.initialize.bind(instance));


export default instance;
