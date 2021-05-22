import type { StrictEffect } from 'redux-saga/effects';

import * as clientCertificateActions from '../../common/actions/clientCertificateActions';
import { call } from '../../common/effects/call';
import { fork } from '../../common/effects/fork';
import { put } from '../../common/effects/put';
import { take } from '../../common/effects/take';
import {
  attachNavigationEvents,
  commitClientCertificateRequest,
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

export function* navigationSaga(): Generator {
  yield* fork(takeClientCertificateRequests);

  yield* call(attachNavigationEvents);
}
