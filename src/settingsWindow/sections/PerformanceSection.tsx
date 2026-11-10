import { Box, FieldGroup } from '@rocket.chat/fuselage';
import { useTranslation } from 'react-i18next';

import { HardwareAcceleration } from '../../ui/components/SettingsView/features/HardwareAcceleration';
import { TransparentWindow } from '../../ui/components/SettingsView/features/TransparentWindow';
import { isDarwin } from '../../ui/windowChrome/appearance';

/**
 * The settings that trade rendering work for CPU, GPU and battery use: hardware
 * acceleration, and on macOS the transparent window material, which the window
 * server must composite on every frame.
 */
export const PerformanceSection = () => {
  const { t } = useTranslation();

  return (
    <Box is='form'>
      <Box is='p' fontScale='p2' color='hint' marginBlockEnd='x24'>
        {t('settings.performanceDescription')}
      </Box>

      <FieldGroup>
        <HardwareAcceleration />
        {isDarwin && <TransparentWindow />}
      </FieldGroup>
    </Box>
  );
};
