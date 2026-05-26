import { Box } from '@rocket.chat/fuselage';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import type { RootState } from '../../../store/rootReducer';
import { CertificateSection } from './CertificateSection';

export const CertificatesManager = () => {
  const trustedCertificates = useSelector(
    ({ trustedCertificates }: RootState) => trustedCertificates
  );

  const notTrustedCertificates = useSelector(
    ({ notTrustedCertificates }: RootState) => notTrustedCertificates
  );

  const { t } = useTranslation();

  return (
    <Box flexGrow={1} flexShrink={1}>
      <CertificateSection
        isFirst
        title={t('certificatesManager.trustedCertificates')}
        hint={t('certificatesManager.trustedHint')}
        emptyText={t('certificatesManager.empty.trusted')}
        urls={Object.keys(trustedCertificates)}
      />
      <CertificateSection
        title={t('certificatesManager.notTrustedCertificates')}
        hint={t('certificatesManager.notTrustedHint')}
        emptyText={t('certificatesManager.empty.notTrusted')}
        urls={Object.keys(notTrustedCertificates)}
      />
    </Box>
  );
};
