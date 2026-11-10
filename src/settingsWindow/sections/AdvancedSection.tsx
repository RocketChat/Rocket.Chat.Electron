import { Box, FieldGroup } from '@rocket.chat/fuselage';
import { useSelector } from 'react-redux';

import type { RootState } from '../../store/rootReducer';
import { DebugLogging } from '../../ui/components/SettingsView/features/DebugLogging';
import { DetailedEventsLogging } from '../../ui/components/SettingsView/features/DetailedEventsLogging';
import { ReportErrors } from '../../ui/components/SettingsView/features/ReportErrors';
import { ResetWindowBounds } from '../../ui/components/SettingsView/features/ResetWindowBounds';
import { SettingGroupDivider } from '../../ui/components/SettingsView/features/SettingGroupDivider';
import { UpdateChannel } from '../../ui/components/SettingsView/features/UpdateChannel';
import { VerboseOutlookLogging } from '../../ui/components/SettingsView/features/VerboseOutlookLogging';

/**
 * The settings a reader reaches for when something is wrong: which version they
 * are on, how it updates, and the switches worth flipping while diagnosing —
 * error reports, and the logging that used to sit behind its own Developer
 * section. Hardware acceleration lives in Performance.
 */
export const AdvancedSection = () => {
  const isDeveloperModeEnabled = useSelector(
    ({ isDeveloperModeEnabled }: RootState) => isDeveloperModeEnabled
  );
  const isUpdatingAllowed = useSelector(
    ({ isUpdatingAllowed }: RootState) => isUpdatingAllowed
  );
  const isUpdatingEnabled = useSelector(
    ({ isUpdatingEnabled }: RootState) => isUpdatingEnabled
  );

  const canUpdate = isUpdatingAllowed && isUpdatingEnabled;

  return (
    <Box is='form'>
      {canUpdate && isDeveloperModeEnabled && (
        <>
          <FieldGroup>
            <UpdateChannel />
          </FieldGroup>

          <SettingGroupDivider />
        </>
      )}

      <FieldGroup>
        <ReportErrors />
      </FieldGroup>

      <SettingGroupDivider />

      <FieldGroup>
        <ResetWindowBounds />
      </FieldGroup>

      {isDeveloperModeEnabled && (
        <>
          <SettingGroupDivider />

          <FieldGroup>
            <DebugLogging />
            <VerboseOutlookLogging />
            <DetailedEventsLogging />
          </FieldGroup>
        </>
      )}
    </Box>
  );
};
