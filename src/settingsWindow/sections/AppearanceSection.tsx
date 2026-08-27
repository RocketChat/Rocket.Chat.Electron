import { Box, FieldGroup } from '@rocket.chat/fuselage';

import { NavigationLayout } from '../../ui/components/SettingsView/features/NavigationLayout';
import { ThemeAppearance } from '../../ui/components/SettingsView/features/ThemeAppearance';
import { TransparentWindow } from '../../ui/components/SettingsView/features/TransparentWindow';
import { isDarwin } from '../../ui/windowChrome/appearance';

/** How the app looks: theme, workspace switcher, window material. */
export const AppearanceSection = () => (
  <Box is='form'>
    <FieldGroup>
      <ThemeAppearance />
      <NavigationLayout />
      {isDarwin && <TransparentWindow />}
    </FieldGroup>
  </Box>
);
