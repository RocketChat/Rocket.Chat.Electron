import { app, dialog } from 'electron';
import jetpack from 'fs-jetpack';
import url from 'url';
import i18n from '../i18n/index.js';

class CertificateStore {
    initWindow (win) {
        this.storeFileName = 'certificate.json';
        this.userDataDir = jetpack.cwd(app.getPath('userData'));

        this.load();

        // Don't ask twice for same cert if loading multiple urls
        this.queued = {};

        this.window = win;
        app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
            event.preventDefault();
            if (this.isTrusted(url, certificate)) {
                callback(true);
                return;
            }

            if (this.queued[certificate.fingerprint]) {
                this.queued[certificate.fingerprint].push(callback);
                // Call the callback after approved/rejected
                return;
            } else {
                this.queued[certificate.fingerprint] = [callback];
            }

            let detail = `URL: ${url}\nError: ${error}`;
            if (this.isExisting(url)) {
                detail = i18n.__('Certificate_error_different', detail);
            }

            dialog.showMessageBox(this.window, {
                title: i18n.__('Certificate_error'),
                message: i18n.__('Certificate_error_message', certificate.issuerName),
                detail: detail,
                type: 'warning',
                buttons: [
                    i18n.__('Yes'),
                    i18n.__('No')
                ],
                cancelId: 1
            }, (response) => {
                if (response === 0) {
                    this.add(url, certificate);
                    this.save();
                    if (webContents.getURL().indexOf('file://') === 0) {
                        webContents.send('certificate-reload', url);
                    }
                }
                //Call all queued callbacks with result
                this.queued[certificate.fingerprint].forEach(cb => cb(response === 0));
                delete this.queued[certificate.fingerprint];
            });
        });
    }

    load () {
        try {
            this.data = this.userDataDir.read(this.storeFileName, 'json');
        } catch (e) {
            console.error(e);
            this.data = {};
        }

        if (this.data === undefined) {
            this.clear();
        }
    }

    clear () {
        this.data = {};
        this.save();
    }

    save () {
        this.userDataDir.write(this.storeFileName, this.data, { atomic: true });
    }

    parseCertificate (certificate) {
        return certificate.issuerName + '\n' + certificate.data.toString();
    }

    getHost (certUrl) {
        return url.parse(certUrl).host;
    }

    add (certUrl, certificate) {
        const host = this.getHost(certUrl);
        this.data[host] = this.parseCertificate(certificate);
    }

    isExisting (certUrl) {
        const host = this.getHost(certUrl);
        return this.data.hasOwnProperty(host);
    }

    isTrusted (certUrl, certificate) {
        const host = this.getHost(certUrl);
        if (!this.isExisting(certUrl)) {
            return false;
        }
        return this.data[host] === this.parseCertificate(certificate);
    }
}

const certificateStore = new CertificateStore();

export default certificateStore;
