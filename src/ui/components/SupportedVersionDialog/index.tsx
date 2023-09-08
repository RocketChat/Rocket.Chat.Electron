import { Box, Button, Modal } from '@rocket.chat/fuselage';
import type { FC } from 'react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../store/actions';
import type { RootState } from '../../../store/rootReducer';
import { SUPPORTED_VERSION_DIALOG_DISMISS } from '../../actions';
import { Dialog } from '../Dialog';
import ModalBackdrop from '../Modal/ModalBackdrop';
import { useServers } from '../hooks/useServers';

export const SupportedVersionDialog: FC = () => {
  const openDialog = useSelector(({ openDialog }: RootState) => openDialog);
  const isVisible = openDialog === 'supported-version';
  const dispatch = useDispatch<Dispatch<RootAction>>();

  const servers = useServers();
  const server = servers.find((server) => server.selected === true);
  const expirationMessage = server?.expirationMessage;

  const { t } = useTranslation();

  const dismissTimeUpdate = (): void => {
    if (!server) return;
    dispatch({
      type: SUPPORTED_VERSION_DIALOG_DISMISS,
      payload: {
        url: server.url,
      },
    });
  };

  const handleMoreInfoButtonClick = (): void => {
    dismissTimeUpdate();
    if (!expirationMessage?.link) return;
    window.open(new URL(expirationMessage?.link));
  };

  return (
    <Dialog isVisible={isVisible} onClose={() => dismissTimeUpdate()}>
      <ModalBackdrop onDismiss={handleMoreInfoButtonClick}>
        <Modal>
          <Modal.Header>
            <Modal.Icon name='warning' color='danger' />
            <Modal.HeaderText>
              <Modal.Title>{expirationMessage?.title}</Modal.Title>
            </Modal.HeaderText>
            <Modal.Close />
          </Modal.Header>
          <Modal.Content>
            <Box alignSelf='center' fontScale='h5'>
              {expirationMessage?.subtitle}
            </Box>

            <Box alignSelf='center' fontScale='p1'>
              {expirationMessage?.description}
            </Box>
          </Modal.Content>
          <Modal.Footer>
            <Modal.FooterControllers>
              <Button secondary onClick={handleMoreInfoButtonClick}>
                {t('unsupportedServer.moreInformation')}
              </Button>
            </Modal.FooterControllers>
          </Modal.Footer>
        </Modal>
      </ModalBackdrop>
    </Dialog>
  );
};
