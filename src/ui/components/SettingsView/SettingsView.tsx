import { Box, Scrollable, Tabs } from '@rocket.chat/fuselage';
import '@rocket.chat/fuselage-polyfills';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import type { RootState } from '../../../store/rootReducer';
import { CertificatesTab } from './CertificatesTab';
import { DeveloperTab } from './DeveloperTab';
import { GeneralTab } from './GeneralTab';
import { VoiceVideoTab } from './VoiceVideoTab';

export const SettingsView = () => {
  const isVisible = useSelector(
    ({ currentView }: RootState) => currentView === 'settings'
  );
  const { t } = useTranslation();

  const [currentTab, setCurrentTab] = useState('general');

  const isDeveloperModeEnabled = useSelector(
    ({ isDeveloperModeEnabled }: RootState) => isDeveloperModeEnabled
  );

  useEffect(() => {
    if (!isDeveloperModeEnabled && currentTab === 'developer') {
      setCurrentTab('general');
    }
  }, [isDeveloperModeEnabled, currentTab]);

  return (
    <Box
      display={isVisible ? 'flex' : 'none'}
      position='absolute'
      flexDirection='column'
      height='full'
      width='full'
      className='rcx-sidebar--main'
      bg='room'
    >
      <Box
        width='full'
        pi='x24'
        pbs='x24'
        pbe='x16'
        display='flex'
        flexDirection='row'
        flexWrap='nowrap'
        alignItems='center'
        fontScale='h1'
        color='default'
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
        <Tabs.Item
          selected={currentTab === 'voiceVideo'}
          onClick={() => setCurrentTab('voiceVideo')}
        >
          {t('settings.voiceVideo')}
        </Tabs.Item>
        {isDeveloperModeEnabled && (
          <Tabs.Item
            selected={currentTab === 'developer'}
            onClick={() => setCurrentTab('developer')}
          >
            {t('settings.developer')}
          </Tabs.Item>
        )}
      </Tabs>
      <Scrollable>
        <Box m='x24'>
          {(currentTab === 'general' && <GeneralTab />) ||
            (currentTab === 'certificates' && <CertificatesTab />) ||
            (currentTab === 'voiceVideo' && <VoiceVideoTab />) ||
            (currentTab === 'developer' && <DeveloperTab />)}
        </Box>
      </Scrollable>
    </Box>
  );
};
