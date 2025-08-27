import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import { Box } from '@rocket.chat/fuselage';
import { Callout } from '@rocket.chat/fuselage';
import { MemoryImprovementsSection } from './MemoryImprovementsSection';
import type { RootState } from '../../../../store/rootReducer';

export const ExperimentalTab: React.FC = () => {
  const { t } = useTranslation();
  const experimentalFeatures = useSelector(
    (state: RootState) => state.experimentalFeatures
  );

  return (
    <Box>
      <Box marginBlockEnd='x16'>
        <Callout type='warning'>
          {t('settings.experimental.warning', 'These features are experimental and may affect stability. Enable at your own risk.')}
        </Callout>
      </Box>

      <MemoryImprovementsSection />

      {/* Space for future experimental features */}
    </Box>
  );
};