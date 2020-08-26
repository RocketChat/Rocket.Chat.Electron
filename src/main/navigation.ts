import fs from 'fs';
import path from 'path';
import url from 'url';

import { app, Certificate, BrowserWindow } from 'electron';
import i18next from 'i18next';
import { Store } from 'redux';

import {
  CERTIFICATES_UPDATED,
  PERSISTABLE_VALUES_MERGED,
  CERTIFICATES_CLIENT_CERTIFICATE_REQUESTED,
} from '../actions';
import { request } from '../channels';
import { selectServers, selectTrustedCertificates } from '../selectors';
import { AskForCertificateTrustResponse, askForCertificateTrust } from './ui/dialogs';

const t = i18next.t.bind(i18next);

const loadUserTrustedCertificates = async (): Promise<Record<string, unknown>> => {
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

const serializeCertificate = (certificate: Certificate): string =>
  `${ certificate.issuerName }\n${ certificate.data.toString() }`;

const queuedTrustRequests = new Map<Certificate['fingerprint'], Array<(isTrusted: boolean) => void>>();

export const setupNavigation = async (reduxStore: Store, rootWindow: BrowserWindow): Promise<void> => {
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

    let detail = `URL: ${ requestedUrl }\nError: ${ error }`;
    if (trustedCertificates[host]) {
      detail = t('error.differentCertificate', { detail });
    }

    const response = await askForCertificateTrust(rootWindow, certificate.issuerName, detail);

    const isTrustedByUser = response === AskForCertificateTrustResponse.YES;

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

  app.addListener('select-client-certificate', async (event, _webContents, _url, certificateList, callback) => {
    event.preventDefault();

    const fingerprint = await request(CERTIFICATES_CLIENT_CERTIFICATE_REQUESTED, JSON.parse(JSON.stringify(certificateList)));
    const certificate = certificateList.find((certificate) => certificate.fingerprint === fingerprint);

    if (!certificate) {
      callback(null);
      return;
    }

    callback(certificate);
  });

  app.addListener('login', (event, _webContents, authenticationResponseDetails, _authInfo, callback) => {
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
