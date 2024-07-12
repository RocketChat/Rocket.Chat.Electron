import { Box, Tabs, Icon } from '@rocket.chat/fuselage';
import '@rocket.chat/fuselage-polyfills';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import type { RootState } from '../../../store/rootReducer';
import { CertificatesTab } from './CertificatesTab';
import { GeneralTab } from './GeneralTab';
import { SidebarActionButton } from '../SideBar/styles';
import { useServers } from '../hooks/useServers';
import { dispatch } from '../../../store';
import { SIDE_BAR_ADD_NEW_SERVER_CLICKED, SIDE_BAR_SERVER_SELECTED } from '../../actions';

export const SettingsView = () => {
  const isVisible = useSelector(
    ({ currentView }: RootState) => currentView === 'settings'
  );
  const { t } = useTranslation();

  const [currentTab, setCurrentTab] = useState('general');
  const servers = useServers();
  
  function handleExitSetting() {
    const firstServer = servers[0];
    if(firstServer) dispatch({ type: SIDE_BAR_SERVER_SELECTED, payload: servers[0].url })
    else dispatch({ type: SIDE_BAR_ADD_NEW_SERVER_CLICKED })
  }

  return (
    <Box
      display={isVisible ? 'flex' : 'none'}
      flexDirection='column'
      height='full'
      backgroundColor='light'
    >
      <Box
        width='full'
        padding={24}
        display='flex'
        flexDirection='row'
        justifyContent='space-between'
        color='default'
        fontScale='h1'
      >
        {t('settings.title')}
        <SidebarActionButton
          tooltip={""}
        >
          <Icon name='cross' onClick={handleExitSetting} />
        </SidebarActionButton>
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
