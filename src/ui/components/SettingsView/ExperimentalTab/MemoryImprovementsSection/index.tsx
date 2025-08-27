import React, { useCallback } from 'react';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import { Box, Divider, ToggleSwitch } from '@rocket.chat/fuselage';
import {
  toggleMemoryImprovements,
  toggleMemoryFeature,
} from '../../../../actions';
import type { RootState } from '../../../../../store/rootReducer';
import { MemoryToggle } from './MemoryToggle';
import { MemoryMetrics } from './MemoryMetrics';

export const MemoryImprovementsSection: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const memorySettings = useSelector(
    (state: RootState) => state.experimentalFeatures?.memoryImprovements
  );

  const handleMasterToggle = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.currentTarget.checked;
      dispatch(toggleMemoryImprovements(isChecked));
    },
    [dispatch]
  );

  const handleFeatureToggle = useCallback(
    (feature: string) => (event: ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.currentTarget.checked;
      dispatch(toggleMemoryFeature(feature, isChecked));
    },
    [dispatch]
  );

  if (!memorySettings) {
    return null;
  }

  return (
    <Box>
      <Box marginBlockEnd='x24'>
        <Box display='flex' alignItems='center' justifyContent='space-between' marginBlockEnd='x24'>
          <Box>
            <Box is='h3' marginBlockEnd='x8' fontWeight='700'>
              {t('settings.experimental.memoryImprovements.title', 'Memory Improvements')}
            </Box>
            <Box fontScale='p2' color='hint'>
              {t('settings.experimental.memoryImprovements.description', 
                'Experimental memory management features to improve stability and performance')}
            </Box>
          </Box>
          <ToggleSwitch
            checked={memorySettings.enabled}
            onChange={handleMasterToggle}
          />
        </Box>
      </Box>

      {memorySettings.enabled && (
        <>
          <Divider />
          
          <Box marginBlock='x24'>
            <MemoryToggle
              label={t('settings.experimental.memoryImprovements.features.monitoring', 'Memory Monitoring')}
              description={t('settings.experimental.memoryImprovements.features.monitoringDesc', 
                'Track memory usage and system health')}
              checked={memorySettings.features.monitoring}
              onChange={handleFeatureToggle('monitoring')}
            />

            <MemoryToggle
              label={t('settings.experimental.memoryImprovements.features.smartCleanup', 'Smart Cleanup')}
              description={t('settings.experimental.memoryImprovements.features.smartCleanupDesc',
                'Automatically clean memory during idle and after system sleep')}
              checked={memorySettings.features.smartCleanup}
              onChange={handleFeatureToggle('smartCleanup')}
            />

            <MemoryToggle
              label={t('settings.experimental.memoryImprovements.features.autoReload', 'Auto-reload Protection')}
              description={t('settings.experimental.memoryImprovements.features.autoReloadDesc',
                'Reload tabs approaching memory limits to prevent crashes')}
              checked={memorySettings.features.autoReload}
              onChange={handleFeatureToggle('autoReload')}
            />

            <MemoryToggle
              label={t('settings.experimental.memoryImprovements.features.domOptimization', 'DOM Optimization')}
              description={t('settings.experimental.memoryImprovements.features.domOptimizationDesc',
                'Reduce memory usage by optimizing page content')}
              checked={memorySettings.features.domOptimization}
              onChange={handleFeatureToggle('domOptimization')}
            />

            <MemoryToggle
              label={t('settings.experimental.memoryImprovements.features.websocket', 'WebSocket Management')}
              description={t('settings.experimental.memoryImprovements.features.websocketDesc',
                'Clean up network connections after system sleep')}
              checked={memorySettings.features.websocket}
              onChange={handleFeatureToggle('websocket')}
            />
          </Box>

          {memorySettings.metrics && (
            <>
              <Divider />
              <MemoryMetrics metrics={memorySettings.metrics} />
            </>
          )}
        </>
      )}
    </Box>
  );
};