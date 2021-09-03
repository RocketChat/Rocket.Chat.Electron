import { Box } from '@rocket.chat/fuselage';
import React, { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import { RootState } from '../../../store/rootReducer';
import { BugsnagOptIn } from './features/BugsnagOptIn';
import { FlashFrameOpt } from './features/FlashFrameOpt';

export const SettingsView: FC = () => {
  const isVisible = useSelector(
    ({ currentView }: RootState) => currentView === 'settings'
  );
  const { t } = useTranslation();
  return (
    <Box
      display={isVisible ? 'flex' : 'none'}
      flexDirection='column'
      height='100vh'
      backgroundColor='surface'
    >
      <Box
        minHeight={64}
        paddingInline={64}
        display='flex'
        flexDirection='row'
        flexWrap='nowrap'
        alignItems='center'
      >
        <Box is='div' color='default' fontScale='h1'>
          {t('settings.title')}
        </Box>
      </Box>

      <Box is='form' padding={64}>
        <BugsnagOptIn />
        <FlashFrameOpt />
      </Box>
    </Box>
  );
};
