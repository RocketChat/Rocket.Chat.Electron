import { Box, FieldGroup } from '@rocket.chat/fuselage';
import React, { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import { RootState } from '../../../store/rootReducer';
import { FlashFrame } from './features/FlashFrame';
import { HardwareAcceleration } from './features/HardwareAcceleration';
import { InternalVideoChatWindow } from './features/InternalVideoChatWindow';
import { MinimizeOnClose } from './features/MinimizeOnClose';
import { ReportErrors } from './features/ReportErrors';

export const SettingsView: FC = () => {
  const isVisible = useSelector(
    ({ currentView }: RootState) => currentView === 'settings'
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
        {t('settings.title')}
      </Box>

      <Box is='form' margin={24} maxWidth={960} flexGrow={1} flexShrink={1}>
        <FieldGroup>
          <ReportErrors />
          <FlashFrame />
          <HardwareAcceleration />
          <InternalVideoChatWindow />
          {process.platform === 'win32' && <MinimizeOnClose />}
        </FieldGroup>
      </Box>
    </Box>
  );
};
