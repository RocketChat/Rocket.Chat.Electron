import {
  Label,
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@rocket.chat/fuselage';
import type { FC } from 'react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import type { RootState } from '../../../store/rootReducer';
import CertificateItem from './CertificateItem';

export const CertificatesManager: FC = () => {
  const trustedCertificates = useSelector(
    ({ trustedCertificates }: RootState) => trustedCertificates
  );

  const notTrustedCertificates = useSelector(
    ({ notTrustedCertificates }: RootState) => notTrustedCertificates
  );

  const { t } = useTranslation();
  return (
    <Box is='form' padding={24} flexGrow={1} flexShrink={1}>
      <Box flexGrow={1} flexShrink={1} paddingBlock={8}>
        <Label>{t('certificatesManager.trustedCertificates')}</Label>
        <Table sticky striped fixed>
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
              <CertificateItem url={url} />
            ))}
          </TableBody>
        </Table>
      </Box>
      <Box marginBlockStart={50} flexGrow={1} flexShrink={1} paddingBlock={8}>
        <Label>{t('certificatesManager.notTrustedCertificates')}</Label>
        <Table sticky striped fixed>
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
              <CertificateItem url={url} />
            ))}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
};
