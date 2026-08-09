import { Box, FieldGroup } from '@rocket.chat/fuselage';

import { ClearPermittedScreenCaptureServers } from '../../ui/components/SettingsView/features/ClearPermittedScreenCaptureServers';
import { InternalVideoChatWindow } from '../../ui/components/SettingsView/features/InternalVideoChatWindow';
import { ScreenCaptureFallback } from '../../ui/components/SettingsView/features/ScreenCaptureFallback';
import { VideoCallWindowPersistence } from '../../ui/components/SettingsView/features/VideoCallWindowPersistence';

export const VideoCallsSection = () => (
  <Box is='form'>
    <FieldGroup>
      <InternalVideoChatWindow />
      <VideoCallWindowPersistence />
      {process.platform === 'win32' && <ScreenCaptureFallback />}
      {!process.mas && <ClearPermittedScreenCaptureServers />}
    </FieldGroup>
  </Box>
);
