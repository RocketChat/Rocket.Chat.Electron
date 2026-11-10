import { Box, FieldGroup } from '@rocket.chat/fuselage';
import { useSelector } from 'react-redux';

import type { RootState } from '../../store/rootReducer';
import { NavigationLayout } from '../../ui/components/SettingsView/features/NavigationLayout';
import { SettingGroupDivider } from '../../ui/components/SettingsView/features/SettingGroupDivider';
import { ThemeAppearance } from '../../ui/components/SettingsView/features/ThemeAppearance';
import { UiPreview } from '../../ui/components/SettingsView/features/UiPreview';

/**
 * How the app looks: theme, workspace switcher, and, in Developer Mode, which
 * web UI build a workspace runs. The transparent window material lives in
 * Performance, because its cost is GPU work on every frame.
 */
export const AppearanceSection = () => {
  const isDeveloperModeEnabled = useSelector(
    ({ isDeveloperModeEnabled }: RootState) => isDeveloperModeEnabled
  );

  return (
    <Box is='form'>
      <FieldGroup>
        <ThemeAppearance />
        <NavigationLayout />
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
