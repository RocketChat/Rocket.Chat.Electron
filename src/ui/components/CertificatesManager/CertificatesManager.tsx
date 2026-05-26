import {
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@rocket.chat/fuselage';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import type { RootState } from '../../../store/rootReducer';
import CertificateItem from './CertificateItem';

type CertificateSectionProps = {
  title: string;
  hint: string;
  emptyText: string;
  urls: string[];
  isFirst?: boolean;
};

const CertificateSection = ({
  title,
  hint,
  emptyText,
  urls,
  isFirst,
}: CertificateSectionProps) => {
  const { t } = useTranslation();
  return (
    <Box mbs={isFirst ? 0 : 32}>
      <Box fontScale='h4' color='font-default' mbe={8}>
        {title}
      </Box>
      <Box fontScale='c1' color='hint' mbe={16}>
        {hint}
      </Box>
      {urls.length === 0 ? (
        <Box fontScale='p2' color='annotation' pb={16}>
          {emptyText}
        </Box>
      ) : (
        <Table fixed>
          <TableHead>
            <TableRow>
              <TableCell>{t('certificatesManager.item.domain')}</TableCell>
              <TableCell align='end' width='x120'>
                {t('certificatesManager.item.actions')}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {urls.map((url) => (
              <CertificateItem key={url} url={url} />
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
};

type CertificatesManagerWrapperProps = {
  children: ReactNode;
};

const CertificatesManagerWrapper = ({
  children,
}: CertificatesManagerWrapperProps) => (
  <Box flexGrow={1} flexShrink={1}>
    {children}
  </Box>
);

export const CertificatesManager = () => {
  const trustedCertificates = useSelector(
    ({ trustedCertificates }: RootState) => trustedCertificates
  );

  const notTrustedCertificates = useSelector(
    ({ notTrustedCertificates }: RootState) => notTrustedCertificates
  );

  const { t } = useTranslation();

  return (
    <CertificatesManagerWrapper>
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
    </CertificatesManagerWrapper>
  );
};
