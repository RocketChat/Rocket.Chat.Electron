import { Box, IconButton, Scrollable, Tabs } from '@rocket.chat/fuselage';
import '@rocket.chat/fuselage-polyfills';
import type { KeyboardEvent } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import { dispatch } from '../../../store';
import type { RootState } from '../../../store/rootReducer';
import { DOWNLOADS_BACK_BUTTON_CLICKED } from '../../actions';
import { CertificatesTab } from './CertificatesTab';
import { DeveloperTab } from './DeveloperTab';
import { GeneralTab } from './GeneralTab';

export const SettingsView = () => {
  const isVisible = useSelector(
    ({ currentView }: RootState) => currentView === 'settings'
  );
  const { t } = useTranslation();

  const [currentTab, setCurrentTab] = useState('general');

  const isSideBarEnabled = useSelector(
    ({ isSideBarEnabled }: RootState) => isSideBarEnabled
  );

  const lastSelectedServerUrl = useSelector(
    ({ lastSelectedServerUrl }: RootState) => lastSelectedServerUrl
  );

  const isDeveloperModeEnabled = useSelector(
    ({ isDeveloperModeEnabled }: RootState) => isDeveloperModeEnabled
  );

  useEffect(() => {
    if (!isDeveloperModeEnabled && currentTab === 'developer') {
      setCurrentTab('general');
    }
  }, [isDeveloperModeEnabled, currentTab]);

  const handleBackButton = useCallback((): void => {
    dispatch({
      type: DOWNLOADS_BACK_BUTTON_CLICKED,
      payload: lastSelectedServerUrl,
    });
  }, [lastSelectedServerUrl]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        handleBackButton();
      }
    },
    [handleBackButton]
  );

  return (
    <Box
      display={isVisible ? 'flex' : 'none'}
      position='absolute'
      flexDirection='column'
      height='full'
      width='full'
      className='rcx-sidebar--main'
      bg='room'
      onKeyDown={handleKeyDown}
      tabIndex={isVisible ? -1 : undefined}
    >
      <Box
        width='full'
        pi={24}
        pbs={24}
        pbe={16}
        display='flex'
        flexDirection='row'
        flexWrap='nowrap'
        alignItems='center'
        fontScale='h2'
        color='default'
      >
        {!isSideBarEnabled && (
          <Box mie={8} display='flex' alignItems='center'>
            <IconButton
              icon='arrow-back'
              onClick={handleBackButton}
              aria-label={t('settings.back')}
            />
          </Box>
        )}
        {t('settings.title')}
      </Box>

      <Box pi={24}>
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
          {isDeveloperModeEnabled && (
            <Tabs.Item
              selected={currentTab === 'developer'}
              onClick={() => setCurrentTab('developer')}
            >
              {t('settings.developer')}
            </Tabs.Item>
          )}
        </Tabs>
      </Box>
      <Scrollable>
        <Box pi={24} pbs={24} pbe={24}>
          {(currentTab === 'general' && <GeneralTab />) ||
            (currentTab === 'certificates' && <CertificatesTab />) ||
            (currentTab === 'developer' && <DeveloperTab />)}
        </Box>
      </Scrollable>
    </Box>
  );
};
