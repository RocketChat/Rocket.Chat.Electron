import fs from 'fs';
import path from 'path';

import { app, Certificate } from 'electron';
import i18next from 'i18next';

import { request, select, dispatch } from '../store';
import {
  AskForCertificateTrustResponse,
  askForCertificateTrust,
  askForOpeningExternalProtocol,
} from '../ui/main/dialogs';
import {
  TRUSTED_CERTIFICATES_UPDATED,
  NOT_TRUSTED_CERTIFICATES_UPDATED,
  CERTIFICATES_CLIENT_CERTIFICATE_REQUESTED,
  SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED,
  SELECT_CLIENT_CERTIFICATE_DIALOG_DISMISSED,
  CERTIFICATES_LOADED,
  EXTERNAL_PROTOCOL_PERMISSION_UPDATED,
} from './actions';

const t = i18next.t.bind(i18next);

const loadUserTrustedCertificates = async (): Promise<
  Record<string, string>
> => {
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
  `${certificate.issuerName}\n${certificate.data.toString()}`;

const queuedTrustRequests = new Map<
  Certificate['fingerprint'],
  Array<(isTrusted: boolean) => void>
>();

export const setupNavigation = async (): Promise<void> => {
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

      let notTrustedCertificates = select(
        ({ notTrustedCertificates }) => notTrustedCertificates
      );

      const isNotTrusted =
        !!notTrustedCertificates[host] &&
        notTrustedCertificates[host] === serialized;

      if (isNotTrusted) {
        callback(false);
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

      const isTrustedByUser = response;

      queuedTrustRequests
        .get(certificate.fingerprint)
        ?.forEach((cb) =>
          cb(isTrustedByUser === AskForCertificateTrustResponse.YES)
        );
      queuedTrustRequests.delete(certificate.fingerprint);

      trustedCertificates = select(
        ({ trustedCertificates }) => trustedCertificates
      );

      if (isTrustedByUser === AskForCertificateTrustResponse.YES) {
        dispatch({
          type: TRUSTED_CERTIFICATES_UPDATED,
          payload: { ...trustedCertificates, [host]: serialized },
        });
      }

      queuedTrustRequests
        .get(certificate.fingerprint)
        ?.forEach((cb) =>
          cb(isTrustedByUser === AskForCertificateTrustResponse.NO)
        );
      queuedTrustRequests.delete(certificate.fingerprint);

      notTrustedCertificates = select(
        ({ notTrustedCertificates }) => notTrustedCertificates
      );

      if (isTrustedByUser === AskForCertificateTrustResponse.NO) {
        dispatch({
          type: NOT_TRUSTED_CERTIFICATES_UPDATED,
          payload: { ...notTrustedCertificates, [host]: serialized },
        });
      }
    }
  );

  app.addListener(
    'select-client-certificate',
    async (event, _webContents, _url, certificateList, callback) => {
      event.preventDefault();

      if (certificateList.length === 1) {
        callback(certificateList[0]);
        return;
      }

      const fingerprint = await request(
        {
          type: CERTIFICATES_CLIENT_CERTIFICATE_REQUESTED,
          payload: JSON.parse(JSON.stringify(certificateList)),
        },
        SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED,
        SELECT_CLIENT_CERTIFICATE_DIALOG_DISMISSED
      );
      const certificate = certificateList.find(
        (certificate) => certificate.fingerprint === fingerprint
      );

      if (!certificate) {
        callback(undefined);
        return;
      }

      callback(certificate);
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

  const trustedCertificates = select(
    ({ trustedCertificates }) => trustedCertificates
  );

  const userTrustedCertificates = await loadUserTrustedCertificates();

  dispatch({
    type: CERTIFICATES_LOADED,
    payload: {
      ...trustedCertificates,
      ...userTrustedCertificates,
    },
  });
};

export const isProtocolAllowed = async (rawUrl: string): Promise<boolean> => {
  const url = new URL(rawUrl);

  const instrinsicProtocols = ['http:', 'https:', 'mailto:'];
  const persistedProtocols = Object.entries(
    select(({ externalProtocols }) => externalProtocols)
  )
    .filter(([, allowed]) => allowed)
    .map(([protocol]) => protocol);
  const allowedProtocols = [...instrinsicProtocols, ...persistedProtocols];

  if (allowedProtocols.includes(url.protocol)) {
    return true;
  }

  const { allowed, dontAskAgain } = await askForOpeningExternalProtocol(url);

  if (dontAskAgain) {
    dispatch({
      type: EXTERNAL_PROTOCOL_PERMISSION_UPDATED,
      payload: {
        protocol: url.protocol,
        allowed,
      },
    });
  }

  return allowed;
};
