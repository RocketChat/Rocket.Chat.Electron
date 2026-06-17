import { Box, FieldGroup } from '@rocket.chat/fuselage';
import { useTranslation } from 'react-i18next';

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
import { TelephonyServer } from './features/TelephonyServer';
import { ThemeAppearance } from './features/ThemeAppearance';
import { TransparentWindow } from './features/TransparentWindow';
import { TrayIcon } from './features/TrayIcon';
import { VideoCallWindowPersistence } from './features/VideoCallWindowPersistence';

export const GeneralTab = () => {
  const { t } = useTranslation();

  const isDarwin = process.platform === 'darwin';
  const isWin32 = process.platform === 'win32';

  return (
    <Box display='flex' justifyContent='center' p='x24'>
      <Box is='form' width='x600' maxWidth='full'>
        <FieldGroup>
          <Box fontScale='h4' mbe='x16' color='default'>
            {t('settings.sections.appUi')}
          </Box>
          <SideBar />
          <ThemeAppearance />
        </FieldGroup>

        <FieldGroup mbs='x24'>
          <Box fontScale='h4' mbe='x16' color='default'>
            {t('settings.sections.systemUi')}
          </Box>
          {isDarwin && <TransparentWindow />}
          <TrayIcon />
          {isWin32 && <MinimizeOnClose />}
          {!isDarwin && <MenuBar />}
          <FlashFrame />
        </FieldGroup>

        <FieldGroup mbs='x24'>
          <Box fontScale='h4' mbe='x16' color='default'>
            {t('settings.sections.systemBehavior')}
          </Box>
          <AvailableBrowsers />
          <InternalVideoChatWindow />
          <VideoCallWindowPersistence />
        </FieldGroup>

        <FieldGroup mbs='x24'>
          <Box fontScale='h4' mbe='x16' color='default'>
            {t('settings.sections.calling')}
          </Box>
          {!process.mas && <ClearPermittedScreenCaptureServers />}
          {isWin32 && <ScreenCaptureFallback />}
          <OutlookCalendarSyncInterval />
          <TelephonyServer />
        </FieldGroup>

        <FieldGroup mbs='x24'>
          <Box fontScale='h4' mbe='x16' color='default'>
            {t('settings.sections.other')}
          </Box>
          <HardwareAcceleration />
          <ReportErrors />
          {isWin32 && <NTLMCredentials />}
          <E2ePdfPreviewSizeLimit />
        </FieldGroup>
      </Box>
    </Box>
  );
};
