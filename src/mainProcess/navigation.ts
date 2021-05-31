import { nanoid } from '@reduxjs/toolkit';
import { app, Certificate } from 'electron';

import * as certificateActions from '../common/actions/certificateActions';
import * as clientCertificateActions from '../common/actions/clientCertificateActions';
import * as serversActions from '../common/actions/serversActions';
import { dispatch } from '../common/store';

const clientCertificateRequests = new Map<
  unknown,
  (certificate: Certificate | undefined) => void
>();

const loginRequests = new Map<
  unknown,
  (username?: string | undefined, password?: string | undefined) => void
>();

const certificateTrustRequests = new Map<unknown, (trusted: boolean) => void>();

export const attachNavigationEvents = (): void => {
  app.userAgentFallback = app.userAgentFallback.replace(
    `${app.name}/${app.getVersion()} `,
    ''
  );

  app.addListener(
    'select-client-certificate',
    (event, _webContents, _url, certificates, callback) => {
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

      const id = nanoid();
      loginRequests.set(id, callback);
      dispatch(
        serversActions.loginRequested(id, authenticationResponseDetails)
      );
    }
  );

  app.addListener(
    'certificate-error',
    (event, _webContents, url, error, certificate, callback) => {
      event.preventDefault();

      const id = nanoid();
      certificateTrustRequests.set(id, callback);
      dispatch(certificateActions.requestQueued(id, url, error, certificate));
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

export const commitLoginRequest = (
  id: unknown,
  username: string,
  password: string
): void => {
  loginRequests.get(id)?.(username, password);
  loginRequests.delete(id);
};

export const denyLoginRequest = (id: unknown): void => {
  loginRequests.get(id)?.();
  loginRequests.delete(id);
};

export const commitCertificateTrustRequest = (
  id: unknown,
  trusted: boolean
): void => {
  certificateTrustRequests.get(id)?.(trusted);
  certificateTrustRequests.delete(id);
};
