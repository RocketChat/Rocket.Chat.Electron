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
    <Box display='flex' justifyContent='center' p='x24'>
      <Box is='form' width='x600' maxWidth='full'>
        <Box pb='x8'>
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
        <Box mbs='x32' pb='x8'>
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
    </Box>
  );
};
