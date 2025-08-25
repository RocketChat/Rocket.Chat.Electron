import { Box, FieldGroup } from '@rocket.chat/fuselage';

import { AvailableBrowsers } from './features/AvailableBrowsers';
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
import { VideoCallWindowPersistence } from './features/VideoCallWindowPersistence';

export const GeneralTab = () => (
  <Box display='flex' justifyContent='center'>
    <FieldGroup is='form' maxWidth={600}>
      <SideBar />
      {process.platform !== 'darwin' && <MenuBar />}
      <TrayIcon />
      {process.platform === 'win32' && <MinimizeOnClose />}
      <AvailableBrowsers />
      <FlashFrame />
      <InternalVideoChatWindow />
      <VideoCallWindowPersistence />
      {!process.mas && <ClearPermittedScreenCaptureServers />}
      <ReportErrors />
      <HardwareAcceleration />
      {process.platform === 'win32' && <NTLMCredentials />}
    </FieldGroup>
  </Box>
);
