import { Box, Tabs } from '@rocket.chat/fuselage';
import '@rocket.chat/fuselage-polyfills';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import type { RootState } from '../../../store/rootReducer';
import { CertificatesTab } from './CertificatesTab';
import { GeneralTab } from './GeneralTab';
import { useDarkMode } from '@rocket.chat/fuselage-hooks';

export const SettingsView = () => {
  const isDark=useDarkMode()
  const isVisible = useSelector(
    ({ currentView }: RootState) => currentView === 'settings'
  );
  const { t } = useTranslation();

  const [currentTab, setCurrentTab] = useState('general');

  return (
    <Box
      display={isVisible ? 'flex' : 'none'}
      flexDirection='column'
      height='full'
      backgroundColor={isDark?'dark':'light'}
    >
      <Box
        width='full'
        padding={24}
        display='flex'
        flexDirection='row'
        flexWrap='nowrap'
        color='default'
        fontScale='h1'
      >
        {t('settings.title')}
      </Box>

      <Tabs>
        <Tabs.Item
          selected={currentTab === 'general'}
          onClick={() => setCurrentTab('general')}
        >
          {t('settings.general')}
        </Tabs.Item>
        <Tabs.Item
          selected={currentTab === 'certificates'}
          onClick={() => setCurrentTab('certificates')}
        >
          {t('settings.certificates')}
        </Tabs.Item>
      </Tabs>
      <Box m='x24' overflowY='auto'>
        {(currentTab === 'general' && <GeneralTab />) ||
          (currentTab === 'certificates' && <CertificatesTab />)}
      </Box>
    </Box>
  );
};
