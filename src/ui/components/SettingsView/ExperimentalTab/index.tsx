import React from 'react';
import { useTranslation } from 'react-i18next';

import { Box, Callout } from '@rocket.chat/fuselage';
import { MemoryImprovementsSection } from './MemoryImprovementsSection';

export const ExperimentalTab: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Box>
      <Box marginBlockEnd='x24'>
        <Callout type='warning'>
          {t('settings.experimental.warning', 'These features are experimental and may affect stability. Enable at your own risk.')}
        </Callout>
      </Box>

      <MemoryImprovementsSection />

      {/* Space for future experimental features */}
    </Box>
  );
};