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
import { ScreenCaptureFallback } from './features/ScreenCaptureFallback';
import { SideBar } from './features/SideBar';
import { ThemeAppearance } from './features/ThemeAppearance';
import { TransparentWindow } from './features/TransparentWindow';
import { TrayIcon } from './features/TrayIcon';
import { VideoCallWindowPersistence } from './features/VideoCallWindowPersistence';

export const GeneralTab = () => (
  <Box display='flex' justifyContent='center'>
    <FieldGroup is='form' maxWidth={600}>
      <ReportErrors />
      <FlashFrame />
      <HardwareAcceleration />
      {process.platform === 'win32' && <ScreenCaptureFallback />}
      <InternalVideoChatWindow />
      <VideoCallWindowPersistence />
      {process.platform === 'darwin' && <TransparentWindow />}
      <TrayIcon />
      {process.platform === 'win32' && <MinimizeOnClose />}
      <SideBar />
      {process.platform !== 'darwin' && <MenuBar />}
      {process.platform === 'win32' && <NTLMCredentials />}
      <ThemeAppearance />
      <AvailableBrowsers />
      {!process.mas && <ClearPermittedScreenCaptureServers />}
    </FieldGroup>
  </Box>
);
