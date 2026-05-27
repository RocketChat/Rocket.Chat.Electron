import {
  Box,
  Button,
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalFooterControllers,
  ModalHeader,
  ModalHeaderText,
  ModalIcon,
  ModalTitle,
} from '@rocket.chat/fuselage';
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
    if (
      !server?.supportedVersions ||
      server?.supportedVersionsFetchState === 'loading'
    )
      return;

    // Skip validation if it was done less than 30 minutes ago
    const thirtyMinutesInMs = 30 * 60 * 1000;
    const timeSinceLastValidation = server.supportedVersionsValidatedAt
      ? moment().diff(server.supportedVersionsValidatedAt, 'milliseconds')
      : undefined;

    if (
      server.supportedVersionsValidatedAt &&
      timeSinceLastValidation !== undefined &&
      timeSinceLastValidation < thirtyMinutesInMs
    ) {
      // Within 30-minute throttle window - skip full validation
      // But still check if 12 hours have passed to show warning again
      if (
        server.expirationMessageLastTimeShown &&
        moment().diff(server.expirationMessageLastTimeShown, 'hours') < 12
      )
        return;

      // If 12 hours have passed, show warning if it exists (for any server)
      if (server.supportedVersions) {
        const supported = await isServerVersionSupported(
          server,
          server.supportedVersions
        );

        if (supported.message && supported.expiration) {
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
        }
      }
      return;
    }

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
          <ModalHeader>
            <ModalIcon name='warning' color='danger' />
            <ModalHeaderText>
              <ModalTitle>{expirationMessage?.title}</ModalTitle>
            </ModalHeaderText>
            <ModalClose onClick={dismissTimeUpdate} />
          </ModalHeader>
          <ModalContent>
            <Box fontScale='p2b'>{expirationMessage?.subtitle}</Box>

            <Box fontScale='p2' mbs={20}>
              {expirationMessage?.description}
            </Box>
          </ModalContent>
          <ModalFooter>
            <ModalFooterControllers>
              <Button secondary onClick={handleMoreInfoButtonClick}>
                {t('unsupportedServer.moreInformation')}
              </Button>
            </ModalFooterControllers>
          </ModalFooter>
        </Modal>
      </ModalBackdrop>
    </Wrapper>
  );
};
