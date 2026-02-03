import { Box, PaletteStyleTag } from '@rocket.chat/fuselage';
import type { Themes } from '@rocket.chat/fuselage/dist/components/PaletteStyleTag/types/themes';
import { useEffect, useLayoutEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import type { RootState } from '../../../store/rootReducer';
import { AboutDialog } from '../AboutDialog';
import { AddServerView } from '../AddServerView';
import { ClearCacheDialog } from '../ClearCacheDialog';
import DownloadsManagerView from '../DownloadsManagerView';
import { OutlookCredentialsDialog } from '../OutlookCredentialsDialog';
import { ScreenSharingDialog } from '../ScreenSharingDialog';
import { SelectClientCertificateDialog } from '../SelectClientCertificateDialog';
import { ServerInfoModal } from '../ServerInfoModal';
import { ServersView } from '../ServersView';
import { SettingsView } from '../SettingsView';
import { SideBar } from '../SideBar';
import { SupportedVersionDialog } from '../SupportedVersionDialog';
import { TopBar } from '../TopBar';
import { UpdateDialog } from '../UpdateDialog';
import TooltipProvider from '../utils/TooltipProvider';
import { GlobalStyles, WindowDragBar } from './styles';

export const Shell = () => {
  const appPath = useSelector(({ appPath }: RootState) => appPath);
  const machineTheme = useSelector(
    ({ machineTheme }: RootState) => machineTheme
  );
  const userThemePreference = useSelector(
    ({ userThemePreference }: RootState) => userThemePreference
  );
  const isTransparentWindowEnabled = useSelector(
    ({ isTransparentWindowEnabled }: RootState) => isTransparentWindowEnabled
  );

  const [currentTheme, setCurrentTheme] = useState<Themes | undefined>(
    machineTheme as Themes
  );

  useEffect(() => {
    if (userThemePreference === 'auto') {
      setCurrentTheme(machineTheme as Themes);
    } else {
      setCurrentTheme(userThemePreference as Themes);
    }
  }, [machineTheme, userThemePreference]);

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
        theme={currentTheme}
        selector=':root'
        // tagId='sidebar-palette'
      />
      <GlobalStyles isTransparentWindowEnabled={isTransparentWindowEnabled} />
      {process.platform === 'darwin' && <WindowDragBar />}
      <Box
        bg={process.platform === 'darwin' ? undefined : 'light'}
        display='flex'
        flexWrap='wrap'
        height='100vh'
        flexDirection='column'
      >
        {process.platform === 'darwin' && <TopBar />}
        <Box display='flex' flexDirection='row' flexGrow={1}>
          <SideBar />
          <Box
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
      <ServerInfoModal />
      <SupportedVersionDialog />
      <ScreenSharingDialog />
      <SelectClientCertificateDialog />
      <UpdateDialog />
      <ClearCacheDialog />
      <OutlookCredentialsDialog />
    </TooltipProvider>
  );
};
