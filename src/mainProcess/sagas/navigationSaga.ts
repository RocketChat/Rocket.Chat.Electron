import type { Certificate } from 'electron';
import i18next from 'i18next';
import { StrictEffect, takeEvery } from 'redux-saga/effects';

import * as certificateActions from '../../common/actions/certificateActions';
import * as clientCertificateActions from '../../common/actions/clientCertificateActions';
import * as serversActions from '../../common/actions/serversActions';
import { call } from '../../common/effects/call';
import { fork } from '../../common/effects/fork';
import { put } from '../../common/effects/put';
import { select } from '../../common/effects/select';
import { take } from '../../common/effects/take';
import {
  askForCertificateTrust,
  AskForCertificateTrustResponse,
} from '../dialogs';
import {
  attachNavigationEvents,
  commitCertificateTrustRequest,
  commitClientCertificateRequest,
  commitLoginRequest,
  denyLoginRequest,
} from '../navigation';

function* takeClientCertificateRequests(): Generator<StrictEffect, void> {
  while (true) {
    const { id, certificates } = (yield* take(
      clientCertificateActions.requestQueued.match
    )).payload;

    yield* put(clientCertificateActions.requested(certificates));

    const response = yield* take<
      | ReturnType<typeof clientCertificateActions.selected>
      | ReturnType<typeof clientCertificateActions.dismissed>
    >([
      clientCertificateActions.selected.match,
      clientCertificateActions.dismissed.match,
    ]);

    const selected =
      response.type === clientCertificateActions.selected.type
        ? certificates.find(
            (certificate) =>
              certificate.fingerprint === response.payload.fingerprint
          )
        : undefined;

    yield* call(commitClientCertificateRequest, id, selected);
  }
}

const serializeCertificate = (certificate: Certificate): string =>
  `${certificate.issuerName}\n${certificate.data.toString()}`;

function* takeCertificateTrustRequests(): Generator<StrictEffect, void> {
  while (true) {
    const { id, url, error, certificate } = (yield* take(
      certificateActions.requestQueued.match
    )).payload;

    const serialized = serializeCertificate(certificate);
    const { host } = new URL(url);

    const trustedCertificates = yield* select(
      (state) => state.navigation.trustedCertificates
    );

    const isTrusted =
      !!trustedCertificates[host] && trustedCertificates[host] === serialized;

    if (isTrusted) {
      yield* call(commitCertificateTrustRequest, id, true);
      return;
    }

    let detail = `URL: ${url}\nError: ${error}`;
    if (trustedCertificates[host]) {
      detail = i18next.t('error.differentCertificate', { detail });
    }

    const response = yield* call(
      askForCertificateTrust,
      certificate.issuerName,
      detail
    );

    const isTrustedByUser = response === AskForCertificateTrustResponse.YES;

    yield* call(commitCertificateTrustRequest, id, isTrustedByUser);

    if (isTrustedByUser) {
      yield* put(certificateActions.trusted(host, serialized));
    }
  }
}

export function* navigationSaga(): Generator {
  yield* fork(takeClientCertificateRequests);
  yield* fork(takeCertificateTrustRequests);

  yield takeEvery(serversActions.loginRequested.match, function* (action) {
    const { id, authenticationResponseDetails } = action.payload;
    const servers = yield* select((state) => state.servers);

    for (const server of servers) {
      const { host: serverHost, username, password } = new URL(server.url);
      const requestHost = new URL(authenticationResponseDetails.url).host;

      if (serverHost !== requestHost || !username) {
        yield* call(denyLoginRequest, id);
        return;
      }

      yield* call(commitLoginRequest, id, username, password);
    }
  });

  yield* call(attachNavigationEvents);
}
