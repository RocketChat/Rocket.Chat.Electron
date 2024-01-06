import { Box, FieldGroup } from '@rocket.chat/fuselage';
import type { FC } from 'react';
import React from 'react';

import { AlwaysStartAtHomePage } from './features/AlwaysStartAtHomePage';
import { ClearPermittedScreenCaptureServers } from './features/ClearPermittedScreenCaptureServers';
import { FlashFrame } from './features/FlashFrame';
import { HardwareAcceleration } from './features/HardwareAcceleration';
import { InternalVideoChatWindow } from './features/InternalVideoChatWindow';
import { MenuBar } from './features/MenuBar';
import { MinimizeOnClose } from './features/MinimizeOnClose';
import { NTLMCredentials } from './features/NTLMCredentials';
import { ReportErrors } from './features/ReportErrors';
import { SideBar } from './features/SideBar';
import { TrayIcon } from './features/TrayIcon';

export const GeneralTab: FC = () => (
  <Box is='form' margin={24} maxWidth={960} flexGrow={1} flexShrink={1}>
    <FieldGroup>
      <AlwaysStartAtHomePage />
      <ReportErrors />
      <FlashFrame />
      <HardwareAcceleration />
      <InternalVideoChatWindow />
      <TrayIcon />
      {process.platform === 'win32' && <MinimizeOnClose />}
      <SideBar />
      {process.platform !== 'darwin' && <MenuBar />}
      {process.platform === 'win32' && <NTLMCredentials />}
      {!process.mas && <ClearPermittedScreenCaptureServers />}
    </FieldGroup>
  </Box>
);
