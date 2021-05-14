import React, { useLayoutEffect, FC } from 'react';

import { useAppSelector } from '../../../common/hooks/useAppSelector';
import { AboutDialog } from '../AboutDialog';
import { AddServerView } from '../AddServerView';
import DownloadsManagerView from '../DownloadsManagerView';
import { ScreenSharingDialog } from '../ScreenSharingDialog';
import { SelectClientCertificateDialog } from '../SelectClientCertificateDialog';
import { ServersView } from '../ServersView';
import { SideBar } from '../SideBar';
import { UpdateDialog } from '../UpdateDialog';
import { GlobalStyles, Wrapper, WindowDragBar, ViewsWrapper } from './styles';

export const Shell: FC = () => {
  const appPath = useAppSelector((state) => state.app.path);

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
      <Wrapper>
        <SideBar />
        <ViewsWrapper>
          <ServersView />
          <AddServerView />
          <DownloadsManagerView />
        </ViewsWrapper>
      </Wrapper>
      <AboutDialog />
      <ScreenSharingDialog />
      <SelectClientCertificateDialog />
      <UpdateDialog />
    </>
  );
};
