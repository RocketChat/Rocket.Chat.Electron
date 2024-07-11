import { Box } from '@rocket.chat/fuselage';
import { useLayoutEffect } from 'react';
import { useSelector } from 'react-redux';

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
import { GlobalStyles, Wrapper, WindowDragBar, ViewsWrapper } from './styles';

export const Shell = () => {
  const appPath = useSelector(({ appPath }: RootState) => appPath);

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
      <GlobalStyles />
      {process.platform === 'darwin' && <WindowDragBar />}
      <Box
        backgroundColor='light'
        display='flex'
        flexWrap='wrap'
        height='100vh'
        flexDirection='column'
      >
        <TopBar />
        <Box display='flex' flexDirection='row' flexGrow={1}>
          <SideBar />
          <Box>CONTENT</Box>
        </Box>
        {/* <ViewsWrapper>
          <ServersView />
          <AddServerView />
          <DownloadsManagerView />
          <SettingsView />
        </ViewsWrapper> */}
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
