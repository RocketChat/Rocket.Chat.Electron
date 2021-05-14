import { app, Certificate } from 'electron';
import i18next from 'i18next';

import {
  CERTIFICATES_UPDATED,
  CERTIFICATES_CLIENT_CERTIFICATE_REQUESTED,
  SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED,
  SELECT_CLIENT_CERTIFICATE_DIALOG_DISMISSED,
  CERTIFICATES_LOADED,
} from '../common/actions/navigationActions';
import { request, select, dispatch } from '../common/store';
import {
  AskForCertificateTrustResponse,
  askForCertificateTrust,
} from './dialogs';
import { joinUserPath } from './joinUserPath';
import { readJsonObject } from './readJsonObject';

const t = i18next.t.bind(i18next);

const serializeCertificate = (certificate: Certificate): string =>
  `${certificate.issuerName}\n${certificate.data.toString()}`;

const queuedTrustRequests = new Map<
  Certificate['fingerprint'],
  Array<(isTrusted: boolean) => void>
>();

export const setupNavigation = async (): Promise<void> => {
  app.userAgentFallback = app.userAgentFallback.replace(
    `${app.name}/${app.getVersion()} `,
    ''
  );

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
  const userTrustedCertificates = await readJsonObject(
    joinUserPath('certificate.json'),
    { discard: true }
  );

  dispatch({
    type: CERTIFICATES_LOADED,
    payload: {
      ...trustedCertificates,
      ...Object.fromEntries(
        Object.entries(userTrustedCertificates).filter(
          (pair): pair is [string, string] =>
            typeof pair[0] === 'string' && typeof pair[1] === 'string'
        )
      ),
    },
  });
};
