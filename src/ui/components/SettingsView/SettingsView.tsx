import {
  Box,
  Button,
  FieldGroup,
  Icon,
  Tabs,
  TabsItem,
} from '@rocket.chat/fuselage';
import React, { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import { dispatch } from '../../../store';
import { RootState } from '../../../store/rootReducer';
import { SETTINGS_CERTIFICATES_MANAGER_BUTTON_CLICKED } from '../../actions';
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
  const handleCertificatesManagerButtonClicked = (): void => {
    dispatch({ type: SETTINGS_CERTIFICATES_MANAGER_BUTTON_CLICKED });
  };
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

      <Tabs>
        <TabsItem selected>General</TabsItem>
        <TabsItem>Certificates</TabsItem>
      </Tabs>

      <Box is='form' margin={24} maxWidth={960} flexGrow={1} flexShrink={1}>
        <FieldGroup>
          <ReportErrors />
          <FlashFrame />
          <HardwareAcceleration />
          <InternalVideoChatWindow />
          {process.platform === 'win32' && <MinimizeOnClose />}
        </FieldGroup>
      </Box>

      <Box is='form' margin={24} maxWidth={960} flexGrow={1} flexShrink={1}>
        <Button onClick={handleCertificatesManagerButtonClicked}>
          <Icon name='key' size='x16' />
          {t('certificatesManager.title')}
        </Button>
      </Box>
    </Box>
  );
};
