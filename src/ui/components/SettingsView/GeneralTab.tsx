import { Box, FieldGroup } from '@rocket.chat/fuselage';

import { AvailableBrowsers } from './features/AvailableBrowsers';
import { FlashFrame } from './features/FlashFrame';
import { HardwareAcceleration } from './features/HardwareAcceleration';
import { MenuBar } from './features/MenuBar';
import { MinimizeOnClose } from './features/MinimizeOnClose';
import { NTLMCredentials } from './features/NTLMCredentials';
import { OutlookCalendarSyncInterval } from './features/OutlookCalendarSyncInterval';
import { ReportErrors } from './features/ReportErrors';
import { SideBar } from './features/SideBar';
import { ThemeAppearance } from './features/ThemeAppearance';
import { TransparentWindow } from './features/TransparentWindow';
import { TrayIcon } from './features/TrayIcon';

export const GeneralTab = () => (
  <Box display='flex' justifyContent='center'>
    <FieldGroup is='form' maxWidth={600}>
      <ReportErrors />
      <FlashFrame />
      <HardwareAcceleration />
      {process.platform === 'darwin' && <TransparentWindow />}
      <TrayIcon />
      {process.platform === 'win32' && <MinimizeOnClose />}
      <SideBar />
      {process.platform !== 'darwin' && <MenuBar />}
      {process.platform === 'win32' && <NTLMCredentials />}
      <ThemeAppearance />
      <AvailableBrowsers />
      <OutlookCalendarSyncInterval />
    </FieldGroup>
  </Box>
);
