import { Box, Button, Margins, Scrollable, Tile } from '@rocket.chat/fuselage';
import { Certificate } from 'electron';
import React, { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import { Dispatch } from 'redux';

import {
  SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED,
  SELECT_CLIENT_CERTIFICATE_DIALOG_DISMISSED,
} from '../../../navigation/actions';
import { RootAction } from '../../../store/actions';
import { RootState } from '../../../store/rootReducer';
import { Dialog } from '../Dialog';

export const SelectClientCertificateDialog: FC = () => {
  const openDialog = useSelector(({ openDialog }: RootState) => openDialog);
  const clientCertificates = useSelector(({ clientCertificates }: RootState) => clientCertificates);
  const isVisible = openDialog === 'select-client-certificate';
  const dispatch = useDispatch<Dispatch<RootAction>>();

  const handleSelect = (certificate: Certificate) => () => {
    dispatch({
      type: SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED,
      payload: certificate.fingerprint,
    });
  };

  const handleClose = (): void => {
    dispatch({ type: SELECT_CLIENT_CERTIFICATE_DIALOG_DISMISSED });
  };

  const { t } = useTranslation();

  return <Dialog isVisible={isVisible} onClose={handleClose}>
    <Box fontScale='h1'>{t('dialog.selectClientCertificate.announcement')}</Box>
    <Margins inline='neg-x12'>
      <Scrollable>
        <Box>
          <Margins all='x12'>
            {clientCertificates.map((certificate, i) => <Tile key={i}>
              <Margins inline='neg-x8'>
                <Box display='flex' alignItems='end' justifyContent='space-between'>
                  <Margins inline='x8'>
                    <Box>
                      <Box fontScale='s1'>
                        {certificate.subjectName}
                      </Box>
                      <Box fontScale='p2'>
                        {certificate.issuerName}
                      </Box>
                      <Box fontScale='c1'>
                        {t('dialog.selectClientCertificate.validDates', {
                          validStart: new Date(certificate.validStart * 1000),
                          validExpiry: new Date(certificate.validExpiry * 1000),
                        })}
                      </Box>
                    </Box>
                    <Button primary flexShrink={1} onClick={handleSelect(certificate)}>
                      {t('dialog.selectClientCertificate.select')}
                    </Button>
                  </Margins>
                </Box>
              </Margins>
            </Tile>)}
          </Margins>
        </Box>
      </Scrollable>
    </Margins>
  </Dialog>;
};
