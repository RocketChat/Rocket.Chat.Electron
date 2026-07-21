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
import { SideBar } from '../SideBar';
import { SupportedVersionDialog } from '../SupportedVersionDialog';
import { TabBar } from '../TabBar';
import { MeatballMenuButton } from '../TabBar/MeatballMenuButton';
import { WindowControls } from '../TabBar/WindowControls';
import { WindowsTitleBar } from '../TabBar/WindowsTitleBar';
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
        bg={isTransparentWindowEnabled ? 'transparent' : 'surface-hover'}
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
          <TabBar />
        )}
        {navigationLayout === 'sidebar' && process.platform === 'darwin' && (
          <TopBar />
        )}
        {navigationLayout === 'sidebar' && process.platform === 'win32' && (
          <WindowsTitleBar />
        )}
        <Box display='flex' flexDirection='row' flexGrow={1}>
          <SideBar />
          <Box
            width='100%'
            position='relative'
            alignSelf='stretch'
            flexBasis='1 1 auto'
            style={{
              boxShadow: '0 0 8px 0px rgba(0,0,0,0.1)',
              border: '1px solid rgba(0,0,0,0.1)',
              overflow: 'hidden',
              borderRadius: '14px',
              margin: '4px',
              marginTop: '0px',
              ...(navigationLayout === 'sidebar'
                ? {
                    marginLeft: '0px',
                  }
                : {}),
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
