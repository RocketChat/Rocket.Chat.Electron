import { Box, Tabs } from '@rocket.chat/fuselage';
import '@rocket.chat/fuselage-polyfills';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import type { RootState } from '../../../store/rootReducer';
import { CertificatesTab } from './CertificatesTab';
import { GeneralTab } from './GeneralTab';

export const SettingsView = () => {
  const isVisible = useSelector(
    ({ currentView }: RootState) => currentView === 'settings'
  );
  const { t } = useTranslation();

  const [currentTab, setCurrentTab] = useState('general');

  return (
    <Box
      display={isVisible ? 'flex' : 'none'}
      position='absolute'
      flexDirection='column'
      height='full'
      width='full'
      className='rcx-sidebar--main'
      bg='light'
    >
      <Box
        width='full'
        padding={24}
        display='flex'
        flexDirection='row'
        flexWrap='nowrap'
        fontScale='h1'
        color='font-default'
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
