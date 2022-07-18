import { Label, Box, Table } from '@rocket.chat/fuselage';
import React, { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import { RootState } from '../../../store/rootReducer';
import CertificateItem from './CertificateItem';

export const CertificatesManager: FC = () => {
  const isVisible = useSelector(
    ({ currentView }: RootState) => currentView === 'certificatesManager'
  );

  const trustedCertificates = useSelector(
    ({ trustedCertificates }: RootState) => trustedCertificates
  );

  const notTrustedCertificates = useSelector(
    ({ notTrustedCertificates }: RootState) => notTrustedCertificates
  );

  const { t } = useTranslation();
  return (
    <Box
      display={isVisible ? 'flex' : 'none'}
      flexDirection='column'
      height='full'
      backgroundColor='surface'
    >
      <Box
        width='full'
        minHeight={64}
        padding={24}
        display='flex'
        flexDirection='row'
        flexWrap='nowrap'
        color='default'
        fontScale='h1'
      >
        {t('certificatesManager.title')}
      </Box>

      <Box is='form' padding={24} flexGrow={1} flexShrink={1}>
        <Box flexGrow={1} flexShrink={1} paddingBlock={8}>
          <Label>Trusted Certificates</Label>
          <Table striped>
            <Table.Head>
              <Table.Row>
                <Table.Cell>Domain</Table.Cell>
                <Table.Cell align='end'>Actions</Table.Cell>
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
          <Label>Not Trusted Certificates</Label>
          <Table striped>
            <Table.Head>
              <Table.Row>
                <Table.Cell>Domain</Table.Cell>
                <Table.Cell align='end'>Actions</Table.Cell>
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
    </Box>
  );
};
