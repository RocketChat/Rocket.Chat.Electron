import { Box, FieldGroup } from '@rocket.chat/fuselage';

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

export const GeneralTab = () => (
  <Box display='flex' justifyContent='center'>
    <FieldGroup is='form' maxWidth={600}>
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
