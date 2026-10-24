import { Box, FieldGroup } from '@rocket.chat/fuselage';
import { useSelector } from 'react-redux';

import type { RootState } from '../../store/rootReducer';
import { NavigationLayout } from '../../ui/components/SettingsView/features/NavigationLayout';
import { SettingGroupDivider } from '../../ui/components/SettingsView/features/SettingGroupDivider';
import { ThemeAppearance } from '../../ui/components/SettingsView/features/ThemeAppearance';
import { TransparentWindow } from '../../ui/components/SettingsView/features/TransparentWindow';
import { UiPreview } from '../../ui/components/SettingsView/features/UiPreview';
import { isDarwin } from '../../ui/windowChrome/appearance';

/** How the app looks: theme, workspace switcher, window material, and, in Developer Mode, which web UI build a workspace runs. */
export const AppearanceSection = () => {
  const isDeveloperModeEnabled = useSelector(
    ({ isDeveloperModeEnabled }: RootState) => isDeveloperModeEnabled
  );

  return (
    <Box is='form'>
      <FieldGroup>
        <ThemeAppearance />
        <NavigationLayout />
        {isDarwin && <TransparentWindow />}
      </FieldGroup>

      {isDeveloperModeEnabled && (
        <>
          <SettingGroupDivider />

          <FieldGroup>
            <UiPreview />
          </FieldGroup>
        </>
      )}
    </Box>
  );
};
