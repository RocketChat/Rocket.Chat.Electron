import { Box, Button, Margins, Scrollable, Tile } from '@rocket.chat/fuselage';
import type { Certificate } from 'electron';
import React, { FC } from 'react';
import { useTranslation } from 'react-i18next';

import * as clientCertificateActions from '../../../common/actions/clientCertificateActions';
import { useAppDispatch } from '../../../common/hooks/useAppDispatch';
import { useAppSelector } from '../../../common/hooks/useAppSelector';
import { Dialog } from '../Dialog';

export const SelectClientCertificateDialog: FC = () => {
  const openDialog = useAppSelector((state) => state.ui.openDialog);
  const clientCertificates = useAppSelector(
    (state) => state.navigation.clientCertificateRequest?.certificates ?? []
  );
  const isVisible = openDialog === 'select-client-certificate';
  const dispatch = useAppDispatch();

  const handleSelect = (certificate: Certificate) => () => {
    dispatch(clientCertificateActions.selected(certificate.fingerprint));
  };

  const handleClose = (): void => {
    dispatch(clientCertificateActions.dismissed());
  };

  const { t } = useTranslation();

  return (
    <Dialog isVisible={isVisible} onClose={handleClose}>
      <Box fontScale='h1'>
        {t('dialog.selectClientCertificate.announcement')}
      </Box>
      <Margins inline='neg-x12'>
        <Scrollable>
          <Box>
            <Margins all='x12'>
              {clientCertificates.map((certificate, i) => (
                <Tile key={i}>
                  <Margins inline='neg-x8'>
                    <Box
                      display='flex'
                      alignItems='end'
                      justifyContent='space-between'
                    >
                      <Margins inline='x8'>
                        <Box>
                          <Box fontScale='s1'>{certificate.subjectName}</Box>
                          <Box fontScale='p2'>{certificate.issuerName}</Box>
                          <Box fontScale='c1'>
                            {t('dialog.selectClientCertificate.validDates', {
                              validStart: new Date(
                                certificate.validStart * 1000
                              ),
                              validExpiry: new Date(
                                certificate.validExpiry * 1000
                              ),
                            })}
                          </Box>
                        </Box>
                        <Button
                          primary
                          flexShrink={1}
                          onClick={handleSelect(certificate)}
                        >
                          {t('dialog.selectClientCertificate.select')}
                        </Button>
                      </Margins>
                    </Box>
                  </Margins>
                </Tile>
              ))}
            </Margins>
          </Box>
        </Scrollable>
      </Margins>
    </Dialog>
  );
};
