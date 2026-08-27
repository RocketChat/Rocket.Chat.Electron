import { Box, FieldGroup } from '@rocket.chat/fuselage';
import { useSelector } from 'react-redux';

import type { RootState } from '../../store/rootReducer';
import { DebugLogging } from '../../ui/components/SettingsView/features/DebugLogging';
import { DetailedEventsLogging } from '../../ui/components/SettingsView/features/DetailedEventsLogging';
import { HardwareAcceleration } from '../../ui/components/SettingsView/features/HardwareAcceleration';
import { ReportErrors } from '../../ui/components/SettingsView/features/ReportErrors';
import { SettingGroupDivider } from '../../ui/components/SettingsView/features/SettingGroupDivider';
import { UpdateChannel } from '../../ui/components/SettingsView/features/UpdateChannel';
import { VerboseOutlookLogging } from '../../ui/components/SettingsView/features/VerboseOutlookLogging';

/**
 * The settings a reader reaches for when something is wrong: which version they
 * are on, how it updates, and the switches worth flipping while diagnosing —
 * hardware acceleration, error reports, and the logging that used to sit behind
 * its own Developer section.
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
        <HardwareAcceleration />
        <ReportErrors />
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
