import { handle } from '../../../ipc/main';
import {
  NOT_TRUSTED_CERTIFICATES_UPDATED,
  TRUSTED_CERTIFICATES_UPDATED,
} from '../../../navigation/actions';
import { dispatch, select } from '../../../store';

export const handleCertificatesManager = (): void => {
  handle('certificatesManager/remove', async (_webContent, domain) => {
    const trustedCertificates = select(
      ({ trustedCertificates }) => trustedCertificates
    );

    const notTrustedCertificates = select(
      ({ notTrustedCertificates }) => notTrustedCertificates
    );

    if (trustedCertificates.hasOwnProperty(domain)) {
      delete trustedCertificates[domain];

      dispatch({
        type: TRUSTED_CERTIFICATES_UPDATED,
        payload: { ...trustedCertificates },
      });
    }

    if (notTrustedCertificates.hasOwnProperty(domain)) {
      delete notTrustedCertificates[domain];

      dispatch({
        type: NOT_TRUSTED_CERTIFICATES_UPDATED,
        payload: { ...notTrustedCertificates },
      });
    }
  });
};
