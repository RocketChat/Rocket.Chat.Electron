import { Box } from '@rocket.chat/fuselage';
import React, { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import { RootState } from '../../../store/rootReducer';
import { BugsnagOptIn } from './features/BugsnagOptIn';

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
        borderBlockEndWidth={2}
        borderBlockEndStyle='solid'
        borderBlockEndColor='neutral-300'
      >
        <Box is='div' color='default' fontScale='h1'>
          {t('settings.title')}
        </Box>
      </Box>

      <Box paddingInline={64}>
        <form>
          <BugsnagOptIn />
        </form>
      </Box>
    </Box>
  );
};
