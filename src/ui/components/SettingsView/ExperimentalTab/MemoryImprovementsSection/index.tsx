import React, { useCallback, useId } from 'react';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import { 
  Box, 
  Divider, 
  ToggleSwitch,
  Field,
  FieldRow,
  FieldLabel,
  FieldHint,
  Accordion 
} from '@rocket.chat/fuselage';
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

  const handleStatusBarToggle = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.currentTarget.checked;
      dispatch(toggleMemoryFeature('showStatusBar', isChecked));
    },
    [dispatch]
  );

  const memoryImprovementsId = useId();

  if (!memorySettings) {
    return null;
  }

  return (
    <>
      <Field>
        <FieldRow>
          <FieldLabel htmlFor={memoryImprovementsId}>
            {t('settings.experimental.memoryImprovements.title', 'Memory Improvements')}
          </FieldLabel>
          <ToggleSwitch
            id={memoryImprovementsId}
            checked={memorySettings.enabled}
            onChange={handleMasterToggle}
          />
        </FieldRow>
        <FieldRow>
          <FieldHint>
            {t('settings.experimental.memoryImprovements.description', 
              'Experimental memory optimization features to reduce memory usage and prevent crashes. Enable this to access individual memory management features below.')}
          </FieldHint>
        </FieldRow>
      </Field>

      {memorySettings.enabled && (
        <>
          <Divider />
          
          {memorySettings.features.monitoring && (
            <>
              <MemoryMetrics />
              <Divider />
            </>
          )}
          
          <Box marginBlock='x24'>
            <MemoryToggle
              label={t('settings.experimental.memoryImprovements.features.monitoring', 'Memory Monitoring')}
              description={t('settings.experimental.memoryImprovements.features.monitoringDesc', 
                'Tracks memory usage and displays real-time metrics in this panel. Required for all other memory features to function.')}
              checked={memorySettings.features.monitoring}
              onChange={handleFeatureToggle('monitoring')}
            />

            {memorySettings.features.monitoring && (
              <MemoryToggle
                label={t('settings.experimental.memoryImprovements.features.statusBar', 'Show in Title Bar')}
                description={t('settings.experimental.memoryImprovements.features.statusBarDesc', 
                  'Displays current memory usage in the application title bar.')}
                checked={memorySettings.showStatusBar}
                onChange={handleStatusBarToggle}
              />
            )}

            <MemoryToggle
              label={t('settings.experimental.memoryImprovements.features.smartCleanup', 'Smart Cleanup')}
              description={t('settings.experimental.memoryImprovements.features.smartCleanupDesc',
                'Automatically frees memory during idle periods and when usage is high. Clears caches and runs garbage collection.')}
              checked={memorySettings.features.smartCleanup}
              onChange={handleFeatureToggle('smartCleanup')}
            />

            <MemoryToggle
              label={t('settings.experimental.memoryImprovements.features.autoReload', 'Auto-reload Protection')}
              description={t('settings.experimental.memoryImprovements.features.autoReloadDesc',
                'Automatically reloads server tabs before they reach memory limits to prevent crashes.')}
              checked={memorySettings.features.autoReload}
              onChange={handleFeatureToggle('autoReload')}
            />

            <MemoryToggle
              label={t('settings.experimental.memoryImprovements.features.domOptimization', 'DOM Optimization')}
              description={t('settings.experimental.memoryImprovements.features.domOptimizationDesc',
                'Optimizes web page elements by removing hidden content and lazy-loading images to reduce memory usage.')}
              checked={memorySettings.features.domOptimization}
              onChange={handleFeatureToggle('domOptimization')}
            />

            <MemoryToggle
              label={t('settings.experimental.memoryImprovements.features.websocket', 'WebSocket Management')}
              description={t('settings.experimental.memoryImprovements.features.websocketDesc',
                'Manages WebSocket connections to prevent memory leaks from idle or orphaned connections.')}
              checked={memorySettings.features.websocket}
              onChange={handleFeatureToggle('websocket')}
            />
          </Box>
        </>
      )}
    </>
  );
};