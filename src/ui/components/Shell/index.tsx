import { Box, PaletteStyleTag } from '@rocket.chat/fuselage';
import type { Themes } from '@rocket.chat/fuselage/dist/components/PaletteStyleTag/types/themes';
import { useEffect, useLayoutEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import { select } from '../../../store';
import type { RootState } from '../../../store/rootReducer';
import { AboutDialog } from '../AboutDialog';
import { AddServerView } from '../AddServerView';
import { ClearCacheDialog } from '../ClearCacheDialog';
import DownloadsManagerView from '../DownloadsManagerView';
import { OutlookCredentialsDialog } from '../OutlookCredentialsDialog';
import { ScreenSharingDialog } from '../ScreenSharingDialog';
import { SelectClientCertificateDialog } from '../SelectClientCertificateDialog';
import { ServersView } from '../ServersView';
import { SettingsView } from '../SettingsView';
import { SideBar } from '../SideBar';
import { SupportedVersionDialog } from '../SupportedVersionDialog';
import { TopBar } from '../TopBar';
import { UpdateDialog } from '../UpdateDialog';
import { GlobalStyles, WindowDragBar } from './styles';

export const Shell = () => {
  const appPath = useSelector(({ appPath }: RootState) => appPath);
  const machineTheme = useSelector(
    ({ machineTheme }: RootState) => machineTheme
  );
  const currentView = useSelector(({ currentView }: RootState) => currentView);

  const currentServerUrl = select(({ currentView }) =>
    typeof currentView === 'object' ? currentView.url : null
  );

  const [currentTheme, setCurrentTheme] = useState<Themes | undefined>(
    machineTheme as Themes
  );

  useEffect(() => {
    if (currentServerUrl !== null) {
      const server = select(({ servers }) =>
        servers.find(
          (s) => new URL(s.url).origin === new URL(currentServerUrl).origin
        )
      );
      console.log(server?.themeAppearance);
      return setCurrentTheme(server?.themeAppearance as Themes);
    }
    console.log(machineTheme);
    setCurrentTheme(machineTheme as Themes);
  }, [currentServerUrl, machineTheme, currentView]);

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
    <>
      <PaletteStyleTag
        theme={currentTheme}
        selector='.rcx-sidebar--main'
        tagId='sidebar-palette'
      />
      <GlobalStyles />
      {process.platform === 'darwin' && <WindowDragBar />}
      <Box
        bg='light'
        display='flex'
        flexWrap='wrap'
        height='100vh'
        flexDirection='column'
      >
        {process.platform === 'darwin' && <TopBar />}
        <Box display='flex' flexDirection='row' flexGrow={1}>
          <SideBar />
          <Box
            backgroundColor='darkblue'
            width='100%'
            position='relative'
            alignSelf='stretch'
            flexBasis='1 1 auto'
          >
            <ServersView />
            <AddServerView />
            <DownloadsManagerView />
            <SettingsView />
          </Box>
        </Box>
      </Box>
      <AboutDialog />
      <SupportedVersionDialog />
      <ScreenSharingDialog />
      <SelectClientCertificateDialog />
      <UpdateDialog />
      <ClearCacheDialog />
      <OutlookCredentialsDialog />
    </>
  );
};
