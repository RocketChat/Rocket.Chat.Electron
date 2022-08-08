import { Label, Box, Table } from '@rocket.chat/fuselage';
import React, { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import { RootState } from '../../../store/rootReducer';
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
          <Table.Head>
            <Table.Row>
              <Table.Cell>{t('certificatesManager.item.domain')}</Table.Cell>
              <Table.Cell align='end'>
                {t('certificatesManager.item.actions')}
              </Table.Cell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {Object.keys(trustedCertificates).map((url) => (
              <CertificateItem url={url} />
            ))}
          </Table.Body>
        </Table>
      </Box>
      <Box marginBlockStart={50} flexGrow={1} flexShrink={1} paddingBlock={8}>
        <Label>{t('certificatesManager.notTrustedCertificates')}</Label>
        <Table sticky striped fixed>
          <Table.Head>
            <Table.Row>
              <Table.Cell>{t('certificatesManager.item.domain')}</Table.Cell>
              <Table.Cell align='end'>
                {t('certificatesManager.item.actions')}
              </Table.Cell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {Object.keys(notTrustedCertificates).map((url) => (
              <CertificateItem url={url} />
            ))}
          </Table.Body>
        </Table>
      </Box>
    </Box>
  );
};
