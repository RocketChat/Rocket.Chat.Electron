import { Box, Button, Margins, Scrollable, Tile } from '@rocket.chat/fuselage';
import type { Certificate } from 'electron';
import React, { FC, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import {
  CERTIFICATES_CLIENT_CERTIFICATE_REQUESTED,
  SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED,
  SELECT_CLIENT_CERTIFICATE_DIALOG_DISMISSED,
} from '../../../common/actions/navigationActions';
import { isResponse } from '../../../common/fsa';
import { useAppDispatch } from '../../../common/hooks/useAppDispatch';
import { useAppSelector } from '../../../common/hooks/useAppSelector';
import { listen } from '../../../common/store';
import { Dialog } from '../Dialog';

export const SelectClientCertificateDialog: FC = () => {
  const openDialog = useAppSelector((state) => state.ui.openDialog);
  const clientCertificates = useAppSelector(
    ({ clientCertificates }) => clientCertificates
  );
  const isVisible = openDialog === 'select-client-certificate';
  const dispatch = useAppDispatch();

  const requestIdRef = useRef<unknown>();

  useEffect(
    () =>
      listen(CERTIFICATES_CLIENT_CERTIFICATE_REQUESTED, (action) => {
        if (!isResponse(action)) {
          return;
        }

        requestIdRef.current = action.meta.id;
      }),
    [dispatch]
  );

  const handleSelect = (certificate: Certificate) => () => {
    dispatch({
      type: SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED,
      payload: certificate.fingerprint,
      meta: {
        response: true,
        id: requestIdRef.current,
      },
    });
  };

  const handleClose = (): void => {
    dispatch({
      type: SELECT_CLIENT_CERTIFICATE_DIALOG_DISMISSED,
      meta: {
        response: true,
        id: requestIdRef.current,
      },
    });
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
