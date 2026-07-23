import { Box, PaletteStyleTag } from '@rocket.chat/fuselage';
import { useLayoutEffect } from 'react';
import { useSelector } from 'react-redux';

import type { RootState } from '../../../store/rootReducer';
import { AboutDialog } from '../AboutDialog';
import { AddServerView } from '../AddServerView';
import { ClearCacheDialog } from '../ClearCacheDialog';
import DownloadsManagerView from '../DownloadsManagerView';
import { OutlookCredentialsDialog } from '../OutlookCredentialsDialog';
import { RootScreenSharePicker } from '../RootScreenSharePicker';
import { ScreenSharingDialog } from '../ScreenSharingDialog';
import { SelectClientCertificateDialog } from '../SelectClientCertificateDialog';
import { ServerInfoModal } from '../ServerInfoModal';
import { ServersView } from '../ServersView';
import { SettingsView } from '../SettingsView';
import { SupportedVersionDialog } from '../SupportedVersionDialog';
import { TabBar } from '../TabBar';
import { MeatballMenuButton } from '../TabBar/MeatballMenuButton';
import { WindowControls } from '../TabBar/WindowControls';
import { TelephonyDefaultHandlerPromptModal } from '../TelephonyDefaultHandlerPromptModal';
import { TelephonyServerSelectModal } from '../TelephonyServerSelectModal';
import { TopBar } from '../TopBar';
import { UpdateDialog } from '../UpdateDialog';
import { useShellTheme } from '../hooks/useShellTheme';
import TooltipProvider from '../utils/TooltipProvider';
import { GlobalStyles, WindowDragBar } from './styles';

export const Shell = () => {
  const appPath = useSelector(({ appPath }: RootState) => appPath);
  const isTransparentWindowEnabled = useSelector(
    ({ isTransparentWindowEnabled }: RootState) => isTransparentWindowEnabled
  );
  const navigationLayout = useSelector(
    ({ navigationLayout }: RootState) => navigationLayout
  );

  const shellTheme = useShellTheme();

  useLayoutEffect(() => {
    if (!appPath) {
      return undefined;
    }

    const linkElement = document.createElement('link');
    linkElement.rel = 'stylesheet';
    linkElement.href = `${appPath}/app/icons/rocketchat.css`;
    document.head.append(linkElement);

    return () => {
      linkElement.remove();
    };
  }, [appPath]);

  return (
    <TooltipProvider>
      <PaletteStyleTag
        theme={shellTheme}
        selector=':root'
        // tagId='sidebar-palette'
      />
      <GlobalStyles isTransparentWindowEnabled={isTransparentWindowEnabled} />
      {navigationLayout === 'sidebar' && process.platform === 'darwin' && (
        <WindowDragBar />
      )}
      <Box
        bg={isTransparentWindowEnabled ? 'transparent' : 'surface-neutral'}
        display='flex'
        flexWrap='wrap'
        height='100vh'
        flexDirection='column'
      >
        {navigationLayout === 'tabs' && process.platform === 'win32' && (
          <TabBar
            leadingSlot={<MeatballMenuButton />}
            trailingSlot={<WindowControls />}
          />
        )}
        {navigationLayout === 'tabs' && process.platform !== 'win32' && (
          <TabBar trailingSlot={<MeatballMenuButton />} />
        )}
        {navigationLayout === 'sidebar' && process.platform === 'darwin' && (
          <TopBar />
        )}
        {navigationLayout === 'sidebar' && process.platform === 'win32' && (
          <TopBar trailingSlot={<WindowControls />} textAlignment='left' />
        )}
        <Box display='flex' flexDirection='row' flexGrow={1}>
          {navigationLayout === 'sidebar' && (
            <TabBar
              orientation='vertical'
              trailingSlot={<MeatballMenuButton orientation='vertical' />}
            />
          )}
          <Box
            width='100%'
            position='relative'
            alignSelf='stretch'
            flexBasis='1 1 auto'
            style={{
              boxShadow: '0 0 3px 0px rgba(0,0,0,0.1)',
              border: '1px solid rgba(0,0,0,0.1)',
              overflow: 'hidden',
              borderRadius: process.platform === 'darwin' ? '14px' : '8px',
              margin: '4px',
              marginTop: '0px',
              // Always set marginLeft explicitly: toggling it via a conditional
              // spread leaves React unable to restore the '4px' shorthand value
              // when the key is removed, so it would stick at 0 after switching.
              marginLeft: navigationLayout === 'sidebar' ? '0px' : '4px',
            }}
          >
            <ServersView />
            <AddServerView />
            <DownloadsManagerView />
            <SettingsView />
          </Box>
        </Box>
      </Box>
      <AboutDialog />
      <ServerInfoModal />
      <SupportedVersionDialog />
      <ScreenSharingDialog />
      <RootScreenSharePicker />
      <SelectClientCertificateDialog />
      <UpdateDialog />
      <ClearCacheDialog />
      <OutlookCredentialsDialog />
      <TelephonyServerSelectModal />
      <TelephonyDefaultHandlerPromptModal />
    </TooltipProvider>
  );
};
