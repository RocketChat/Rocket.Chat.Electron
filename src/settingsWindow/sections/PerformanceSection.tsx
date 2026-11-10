import { Box, FieldGroup } from '@rocket.chat/fuselage';

import { HardwareAcceleration } from '../../ui/components/SettingsView/features/HardwareAcceleration';
import { TransparentWindow } from '../../ui/components/SettingsView/features/TransparentWindow';
import { isDarwin } from '../../ui/windowChrome/appearance';

/**
 * The settings that trade rendering work for CPU, GPU and battery use: hardware
 * acceleration, and on macOS the transparent window material, which the window
 * server must composite on every frame.
 */
export const PerformanceSection = () => (
  <Box is='form'>
    <FieldGroup>
      <HardwareAcceleration />
      {isDarwin && <TransparentWindow />}
    </FieldGroup>
  </Box>
);
