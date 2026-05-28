import {
  Label,
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@rocket.chat/fuselage';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import type { RootState } from '../../../store/rootReducer';
import CertificateItem from './CertificateItem';

export const CertificatesManager = () => {
  const trustedCertificates = useSelector(
    ({ trustedCertificates }: RootState) => trustedCertificates
  );

  const notTrustedCertificates = useSelector(
    ({ notTrustedCertificates }: RootState) => notTrustedCertificates
  );

  const { t } = useTranslation();
  return (
    <Box is='form' p='x24' flexGrow={1} flexShrink={1}>
      <Box flexGrow={1} flexShrink={1} pb='x8'>
        <Label>{t('certificatesManager.trustedCertificates')}</Label>
        <Table sticky fixed>
          <TableHead>
            <TableRow>
              <TableCell>{t('certificatesManager.item.domain')}</TableCell>
              <TableCell align='end'>
                {t('certificatesManager.item.actions')}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.keys(trustedCertificates).map((url) => (
              <CertificateItem key={url} url={url} />
            ))}
          </TableBody>
        </Table>
      </Box>
      <Box mbs='x32' flexGrow={1} flexShrink={1} pb='x8'>
        <Label>{t('certificatesManager.notTrustedCertificates')}</Label>
        <Table sticky fixed>
          <TableHead>
            <TableRow>
              <TableCell>{t('certificatesManager.item.domain')}</TableCell>
              <TableCell align='end'>
                {t('certificatesManager.item.actions')}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.keys(notTrustedCertificates).map((url) => (
              <CertificateItem key={url} url={url} />
            ))}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
};
