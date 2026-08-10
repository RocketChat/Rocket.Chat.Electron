import { Box, FieldGroup } from '@rocket.chat/fuselage';

import { AvailableBrowsers } from '../../ui/components/SettingsView/features/AvailableBrowsers';
import { CheckForUpdates } from '../../ui/components/SettingsView/features/CheckForUpdates';
import { DownloadsPercentage } from '../../ui/components/SettingsView/features/DownloadsPercentage';
import { E2ePdfPreviewSizeLimit } from '../../ui/components/SettingsView/features/E2ePdfPreviewSizeLimit';
import { FlashFrame } from '../../ui/components/SettingsView/features/FlashFrame';
import { MenuBar } from '../../ui/components/SettingsView/features/MenuBar';
import { MinimizeOnClose } from '../../ui/components/SettingsView/features/MinimizeOnClose';
import { NTLMCredentials } from '../../ui/components/SettingsView/features/NTLMCredentials';
import { OutlookCalendarSyncInterval } from '../../ui/components/SettingsView/features/OutlookCalendarSyncInterval';
import { SettingGroupDivider } from '../../ui/components/SettingsView/features/SettingGroupDivider';
import { TrayIcon } from '../../ui/components/SettingsView/features/TrayIcon';
import { isDarwin } from '../../ui/windowChrome/appearance';

const isWin32 = process.platform === 'win32';

/** Everything that is not appearance, calling or advanced. */
export const GeneralSection = () => (
  <Box is='form'>
    <FieldGroup>
      <CheckForUpdates />
    </FieldGroup>

    <SettingGroupDivider />

    {/*
      One group, so every row is spaced the same. The extra margin these used to
      be split across read as an accident — nothing distinguished the settings on
      either side of it.
    */}
    <FieldGroup>
      <TrayIcon />
      {isWin32 && <MinimizeOnClose />}
      {!isDarwin && !isWin32 && <MenuBar />}
      <FlashFrame />
      <DownloadsPercentage />
      <AvailableBrowsers />
      <OutlookCalendarSyncInterval />
      <E2ePdfPreviewSizeLimit />
      {isWin32 && <NTLMCredentials />}
    </FieldGroup>
  </Box>
);
