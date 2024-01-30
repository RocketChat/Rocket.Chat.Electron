import { Box, Button, Modal } from '@rocket.chat/fuselage';
import { ipcRenderer } from 'electron';
import moment from 'moment';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import type { Dispatch } from 'redux';

import { getLanguage } from '../../../i18n/main';
import {
  getExpirationMessageTranslated,
  isServerVersionSupported,
} from '../../../servers/supportedVersions/main';
import type { MessageTranslated } from '../../../servers/supportedVersions/types';
import type { RootAction } from '../../../store/actions';
import * as urls from '../../../urls';
import {
  SUPPORTED_VERSION_DIALOG_DISMISS,
  WEBVIEW_SERVER_IS_SUPPORTED_VERSION,
} from '../../actions';
import { currentView } from '../../reducers/currentView';
import ModalBackdrop from '../Modal/ModalBackdrop';
import { useServers } from '../hooks/useServers';
import { Wrapper } from './styles';

export const SupportedVersionDialog = () => {
  const [isVisible, setIsVisible] = useState(false);
  const dispatch = useDispatch<Dispatch<RootAction>>();

  const servers = useServers();
  const server = servers.find((server) => server.selected === true);
  const [expirationMessage, setExpirationMessage] =
    useState<MessageTranslated>();

  const { t } = useTranslation();

  const dismissTimeUpdate = (): void => {
    setIsVisible(false);
    if (!server) return;
    dispatch({
      type: SUPPORTED_VERSION_DIALOG_DISMISS,
      payload: {
        url: server.url,
      },
    });
  };

  const checkServerVersion = useCallback(async () => {
    if (!server?.supportedVersions) return;

    const supported = await isServerVersionSupported(
      server,
      server?.supportedVersions
    );

    dispatch({
      type: WEBVIEW_SERVER_IS_SUPPORTED_VERSION,
      payload: {
        url: server.url,
        isSupportedVersion: supported.supported,
      },
    });

    if (!supported.message || !supported.expiration) return;

    if (
      server.expirationMessageLastTimeShown &&
      moment().diff(server.expirationMessageLastTimeShown, 'hours') < 12
    )
      return;

    const translatedMessage = getExpirationMessageTranslated(
      supported?.i18n,
      supported.message,
      supported.expiration,
      getLanguage,
      server.title,
      server.url,
      server.version
    ) as MessageTranslated;

    if (translatedMessage) {
      setExpirationMessage(translatedMessage);
      setIsVisible(supported.supported);
    }
  }, [server, dispatch, setExpirationMessage, setIsVisible]);

  useEffect(() => {
    checkServerVersion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server?.supportedVersions, server?.lastPath, currentView]);

  const handleMoreInfoButtonClick = (): void => {
    if (expirationMessage?.link && expirationMessage?.link !== '') {
      ipcRenderer.invoke(
        'server-view/open-url-on-browser',
        expirationMessage?.link
      );
    }
    ipcRenderer.invoke(
      'server-view/open-url-on-browser',
      urls.docs.supportedVersions
    );
  };

  return (
    <Wrapper isVisible={isVisible}>
      <ModalBackdrop>
        <Modal>
          <Modal.Header>
            <Modal.Icon name='warning' color='danger' />
            <Modal.HeaderText>
              <Modal.Title>{expirationMessage?.title}</Modal.Title>
            </Modal.HeaderText>
            <Modal.Close onClick={dismissTimeUpdate} />
          </Modal.Header>
          <Modal.Content>
            <Box fontScale='p2b'>{expirationMessage?.subtitle}</Box>

            <Box fontScale='p2' mbs={20}>
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
    </Wrapper>
  );
};
