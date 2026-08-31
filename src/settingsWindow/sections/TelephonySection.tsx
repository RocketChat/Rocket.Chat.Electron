import { Box, FieldGroup } from '@rocket.chat/fuselage';

import { Telephony } from '../../ui/components/SettingsView/features/Telephony';
import { TelephonyGlobalShortcut } from '../../ui/components/SettingsView/features/TelephonyGlobalShortcut';
import { TelephonyServer } from '../../ui/components/SettingsView/features/TelephonyServer';

export const TelephonySection = () => (
  <Box is='form'>
    <FieldGroup>
      <Telephony />
      <TelephonyGlobalShortcut />
      <TelephonyServer />
    </FieldGroup>
  </Box>
);
