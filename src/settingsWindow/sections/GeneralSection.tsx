import { Box, FieldGroup } from '@rocket.chat/fuselage';

import { AvailableBrowsers } from '../../ui/components/SettingsView/features/AvailableBrowsers';
import { E2ePdfPreviewSizeLimit } from '../../ui/components/SettingsView/features/E2ePdfPreviewSizeLimit';
import { FlashFrame } from '../../ui/components/SettingsView/features/FlashFrame';
import { HardwareAcceleration } from '../../ui/components/SettingsView/features/HardwareAcceleration';
import { MenuBar } from '../../ui/components/SettingsView/features/MenuBar';
import { MinimizeOnClose } from '../../ui/components/SettingsView/features/MinimizeOnClose';
import { NTLMCredentials } from '../../ui/components/SettingsView/features/NTLMCredentials';
import { OutlookCalendarSyncInterval } from '../../ui/components/SettingsView/features/OutlookCalendarSyncInterval';
import { ReportErrors } from '../../ui/components/SettingsView/features/ReportErrors';
import { TrayIcon } from '../../ui/components/SettingsView/features/TrayIcon';
import { isDarwin } from '../../ui/windowChrome/appearance';

const isWin32 = process.platform === 'win32';

/** Everything that is not appearance, calling or developer-only. */
export const GeneralSection = () => (
  <Box is='form'>
    <FieldGroup>
      <TrayIcon />
      {isWin32 && <MinimizeOnClose />}
      {!isDarwin && !isWin32 && <MenuBar />}
      <FlashFrame />
    </FieldGroup>

    <FieldGroup mbs='x24'>
      <AvailableBrowsers />
      <OutlookCalendarSyncInterval />
    </FieldGroup>

    <FieldGroup mbs='x24'>
      <HardwareAcceleration />
      <E2ePdfPreviewSizeLimit />
      <ReportErrors />
      {isWin32 && <NTLMCredentials />}
    </FieldGroup>
  </Box>
);
