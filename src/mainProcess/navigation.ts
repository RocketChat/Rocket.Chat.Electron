import { nanoid } from '@reduxjs/toolkit';
import { app, Certificate } from 'electron';
import i18next from 'i18next';

import * as clientCertificateActions from '../common/actions/clientCertificateActions';
import { CERTIFICATES_UPDATED } from '../common/actions/navigationActions';
import { select, dispatch } from '../common/store';
import {
  AskForCertificateTrustResponse,
  askForCertificateTrust,
} from './dialogs';

const t = i18next.t.bind(i18next);

const serializeCertificate = (certificate: Certificate): string =>
  `${certificate.issuerName}\n${certificate.data.toString()}`;

const queuedTrustRequests = new Map<
  Certificate['fingerprint'],
  Array<(isTrusted: boolean) => void>
>();

const clientCertificateRequests = new Map<
  unknown,
  (certificate: Certificate | undefined) => void
>();

export const setupNavigation = (): void => {
  app.addListener(
    'certificate-error',
    async (event, _webContents, requestedUrl, error, certificate, callback) => {
      event.preventDefault();

      const serialized = serializeCertificate(certificate);
      const { host } = new URL(requestedUrl);

      let trustedCertificates = select(
        ({ trustedCertificates }) => trustedCertificates
      );

      const isTrusted =
        !!trustedCertificates[host] && trustedCertificates[host] === serialized;

      if (isTrusted) {
        callback(true);
        return;
      }

      if (queuedTrustRequests.has(certificate.fingerprint)) {
        queuedTrustRequests.get(certificate.fingerprint)?.push(callback);
        return;
      }

      queuedTrustRequests.set(certificate.fingerprint, [callback]);

      let detail = `URL: ${requestedUrl}\nError: ${error}`;
      if (trustedCertificates[host]) {
        detail = t('error.differentCertificate', { detail });
      }

      const response = await askForCertificateTrust(
        certificate.issuerName,
        detail
      );

      const isTrustedByUser = response === AskForCertificateTrustResponse.YES;

      queuedTrustRequests
        .get(certificate.fingerprint)
        ?.forEach((cb) => cb(isTrustedByUser));
      queuedTrustRequests.delete(certificate.fingerprint);

      trustedCertificates = select(
        ({ trustedCertificates }) => trustedCertificates
      );

      if (isTrustedByUser) {
        dispatch({
          type: CERTIFICATES_UPDATED,
          payload: { ...trustedCertificates, [host]: serialized },
        });
      }
    }
  );

  app.addListener(
    'login',
    (
      event,
      _webContents,
      authenticationResponseDetails,
      _authInfo,
      callback
    ) => {
      event.preventDefault();

      const servers = select(({ servers }) => servers);

      for (const server of servers) {
        const { host: serverHost, username, password } = new URL(server.url);
        const requestHost = new URL(authenticationResponseDetails.url).host;

        if (serverHost !== requestHost || !username) {
          callback();
          return;
        }

        callback(username, password);
      }
    }
  );
};

export const attachNavigationEvents = (): void => {
  app.userAgentFallback = app.userAgentFallback.replace(
    `${app.name}/${app.getVersion()} `,
    ''
  );

  app.addListener(
    'select-client-certificate',
    async (event, _webContents, _url, certificates, callback) => {
      event.preventDefault();

      if (certificates.length === 1) {
        callback(certificates[0]);
        return;
      }

      const id = nanoid();
      clientCertificateRequests.set(id, callback);
      dispatch(clientCertificateActions.requestQueued(id, certificates));
    }
  );
};

export const commitClientCertificateRequest = (
  id: unknown,
  selected: Certificate | undefined
): void => {
  clientCertificateRequests.get(id)?.(selected);
  clientCertificateRequests.delete(id);
};
