import { Box, Margins } from '@rocket.chat/fuselage';
import type { FC } from 'react';
import React from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../store/actions';
import type { RootState } from '../../../store/rootReducer';
import { SUPPORTED_VERSION_DIALOG_DISMISS } from '../../actions';
import { Dialog } from '../Dialog';
import { useServers } from '../hooks/useServers';

export const SupportedVersionDialog: FC = () => {
  const openDialog = useSelector(({ openDialog }: RootState) => openDialog);
  const appVersion = useSelector(({ appVersion }: RootState) => appVersion);
  const isVisible = openDialog === 'supported-version';
  const dispatch = useDispatch<Dispatch<RootAction>>();

  const servers = useServers();
  const server = servers.find((server) => server.selected === true);

  const { t } = useTranslation();

  return (
    <Dialog
      isVisible={isVisible}
      onClose={() => dispatch({ type: SUPPORTED_VERSION_DIALOG_DISMISS })}
    >
      <Margins block='x16'>
        <Box alignSelf='center' fontScale='h1'>
          Expiring Support
        </Box>

        <Box alignSelf='center' fontScale='h4'>
          The support for this version of Rocket.Chat Server is expiring in 7
          days.
        </Box>

        <Box alignSelf='center' fontScale='p1'>
          Please contact the administrator of this server to upgrade to the
          latest version.
        </Box>

        <Box alignSelf='center'>
          <Trans t={t} i18nKey='dialog.supportedVersion.version'>
            Version:
            <Box is='span' fontScale='p2' style={{ userSelect: 'text' }}>
              {{ version: appVersion }}
            </Box>
          </Trans>
        </Box>
      </Margins>
    </Dialog>
  );
};
