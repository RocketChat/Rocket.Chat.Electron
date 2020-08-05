import fs from 'fs';
import path from 'path';
import url from 'url';

import { app, ipcMain } from 'electron';
import { t } from 'i18next';

import {
	CERTIFICATES_UPDATED,
	PERSISTABLE_VALUES_MERGED,
} from '../actions';
import { selectServers, selectTrustedCertificates } from './selectors';
import { AskForCertificateTrustResponse, askForCertificateTrust } from './ui/dialogs';
import { EVENT_CLIENT_CERTIFICATE_SELECTED, EVENT_CLIENT_CERTIFICATE_REQUESTED } from '../ipc';

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

export const setupNavigation = async (reduxStore, rootWindow) => {
	const trustedCertificates = selectTrustedCertificates(reduxStore.getState());
	const userTrustedCertificates = await loadUserTrustedCertificates();

	reduxStore.dispatch({
		type: PERSISTABLE_VALUES_MERGED,
		payload: {
			trustedCertificates: {
				...trustedCertificates,
				...userTrustedCertificates,
			},
		},
	});

	app.addListener('certificate-error', async (event, webContents, requestedUrl, error, certificate, callback) => {
		if (webContents.id !== rootWindow.webContents.id) {
			return;
		}

		event.preventDefault();

		const serialized = serializeCertificate(certificate);
		const { host } = url.parse(requestedUrl);

		let trustedCertificates = selectTrustedCertificates(reduxStore.getState());

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

		let isTrustedByUser = false;

		let detail = `URL: ${ requestedUrl }\nError: ${ error }`;
		if (trustedCertificates[host]) {
			detail = t('error.differentCertificate', { detail });
		}

		const response = await askForCertificateTrust(rootWindow, certificate.issuerName, detail);

		if (response === AskForCertificateTrustResponse.YES) {
			isTrustedByUser = true;
			return;
		}

		isTrustedByUser = false;

		queuedTrustRequests.get(certificate.fingerprint).forEach((cb) => cb(isTrustedByUser));
		queuedTrustRequests.delete(certificate.fingerprint);

		trustedCertificates = selectTrustedCertificates(reduxStore.getState());

		if (isTrustedByUser) {
			reduxStore.dispatch({
				type: CERTIFICATES_UPDATED,
				payload: { ...trustedCertificates, [host]: serialized },
			});
		}
	});

	app.addListener('select-client-certificate', async (event, webContents, url, certificateList, callback) => {
		event.preventDefault();

		certificateList = JSON.parse(JSON.stringify(certificateList));

		const response = new Promise((resolve) => {
			ipcMain.prependOnceListener(EVENT_CLIENT_CERTIFICATE_SELECTED, (event, fingerprint) => {
				resolve(fingerprint);
			});

			webContents.send(EVENT_CLIENT_CERTIFICATE_REQUESTED, certificateList);
		});

		const fingerprint = await response;

		const certificate = certificateList.find((certificate) => certificate.fingerprint === fingerprint);

		if (!certificate) {
			callback(null);
			return;
		}

		callback(certificate);
	});

	app.addListener('login', (event, webContents, authenticationResponseDetails, authInfo, callback) => {
		event.preventDefault();

		const servers = selectServers(reduxStore.getState());

		for (const server of servers) {
			const { host: serverHost, auth } = url.parse(server.url);
			const requestHost = url.parse(authenticationResponseDetails.url).host;

			if (serverHost !== requestHost || !auth) {
				callback();
				return;
			}

			const [username, password] = auth.split(/:/);
			callback(username, password);
		}
	});
};
