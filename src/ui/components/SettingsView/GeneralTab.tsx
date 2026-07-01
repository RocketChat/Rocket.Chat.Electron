import { Box, FieldGroup } from '@rocket.chat/fuselage';

import { AvailableBrowsers } from './features/AvailableBrowsers';
import { ClearPermittedScreenCaptureServers } from './features/ClearPermittedScreenCaptureServers';
import { E2ePdfPreviewSizeLimit } from './features/E2ePdfPreviewSizeLimit';
import { FlashFrame } from './features/FlashFrame';
import { HardwareAcceleration } from './features/HardwareAcceleration';
import { InternalVideoChatWindow } from './features/InternalVideoChatWindow';
import { MenuBar } from './features/MenuBar';
import { MinimizeOnClose } from './features/MinimizeOnClose';
import { NTLMCredentials } from './features/NTLMCredentials';
import { OutlookCalendarSyncInterval } from './features/OutlookCalendarSyncInterval';
import { ReportErrors } from './features/ReportErrors';
import { ScreenCaptureFallback } from './features/ScreenCaptureFallback';
import { SideBar } from './features/SideBar';
import { ThemeAppearance } from './features/ThemeAppearance';
import { TransparentWindow } from './features/TransparentWindow';
import { TrayIcon } from './features/TrayIcon';
import { VideoCallWindowPersistence } from './features/VideoCallWindowPersistence';

export const GeneralTab = () => {
  const isDarwin = process.platform === 'darwin';
  const isWin32 = process.platform === 'win32';

  return (
    <Box display='flex' justifyContent='center' p='x24'>
      <Box is='form' width='x600' maxWidth='full'>
        <FieldGroup>
          <SideBar />
          <ThemeAppearance />
        </FieldGroup>

        <FieldGroup mbs='x24'>
          {isDarwin && <TransparentWindow />}
          <TrayIcon />
          {isWin32 && <MinimizeOnClose />}
          {!isDarwin && <MenuBar />}
          <FlashFrame />
        </FieldGroup>

        <FieldGroup mbs='x24'>
          <AvailableBrowsers />
          <InternalVideoChatWindow />
          <VideoCallWindowPersistence />
        </FieldGroup>

        <FieldGroup mbs='x24'>
          {!process.mas && <ClearPermittedScreenCaptureServers />}
          {isWin32 && <ScreenCaptureFallback />}
          <OutlookCalendarSyncInterval />
        </FieldGroup>

        <FieldGroup mbs='x24'>
          <HardwareAcceleration />
          <E2ePdfPreviewSizeLimit />
          <ReportErrors />
          {isWin32 && <NTLMCredentials />}
        </FieldGroup>
      </Box>
    </Box>
  );
};
