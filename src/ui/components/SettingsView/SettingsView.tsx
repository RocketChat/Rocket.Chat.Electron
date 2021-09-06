import { Box } from '@rocket.chat/fuselage';
import React, { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import { RootState } from '../../../store/rootReducer';
import { FlashFrame } from './features/FlashFrame';
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
      height='100vh'
      backgroundColor='surface'
      alignItems='center'
    >
      <Box
        width='full'
        minHeight={64}
        paddingInline={36}
        margin={12}
        display='flex'
        flexDirection='row'
        flexWrap='nowrap'
        alignItems='center'
        color='default'
        fontScale='h1'
      >
        {t('settings.title')}
      </Box>

      <Box is='form' maxWidth={960}>
        <ReportErrors />
        <FlashFrame />
      </Box>
    </Box>
  );
};
