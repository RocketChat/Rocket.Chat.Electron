import { Box, FieldGroup } from '@rocket.chat/fuselage';

import { AvailableBrowsers } from './features/AvailableBrowsers';
import { E2ePdfPreviewSizeLimit } from './features/E2ePdfPreviewSizeLimit';
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
  <Box display='flex' justifyContent='center' p='x24'>
    <Box is='form' width='x600' maxWidth='full'>
      <FieldGroup>
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
        <E2ePdfPreviewSizeLimit />
      </FieldGroup>
    </Box>
  </Box>
);
