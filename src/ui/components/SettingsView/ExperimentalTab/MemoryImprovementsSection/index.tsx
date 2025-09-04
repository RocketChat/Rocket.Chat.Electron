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
              'Advanced memory management system designed to prevent crashes and reduce memory usage. Works within Chromium\'s 4GB per-process limit. Enable features individually to test their impact on your system.')}
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
                'Tracks app memory usage every 2 minutes. Monitors memory pressure levels and stores 6 hours of history. Exports diagnostic reports when memory issues are detected.')}
              checked={memorySettings.features.monitoring}
              onChange={handleFeatureToggle('monitoring')}
            />

            {memorySettings.features.monitoring && (
              <MemoryToggle
                label={t('settings.experimental.memoryImprovements.features.statusBar', 'Show in Title Bar')}
                description={t('settings.experimental.memoryImprovements.features.statusBarDesc', 
                  'Display total app memory usage in the title bar for quick monitoring without opening settings.')}
                checked={memorySettings.showStatusBar}
                onChange={handleStatusBarToggle}
              />
            )}

            <MemoryToggle
              label={t('settings.experimental.memoryImprovements.features.smartCleanup', 'Smart Cleanup')}
              description={t('settings.experimental.memoryImprovements.features.smartCleanupDesc',
                'Runs cleanup after 5 minutes of idle time, during system sleep/resume, and when memory usage exceeds 80%. Clears Electron caches, runs garbage collection, and can free 50-200MB per cleanup cycle.')}
              checked={memorySettings.features.smartCleanup}
              onChange={handleFeatureToggle('smartCleanup')}
            />

            <MemoryToggle
              label={t('settings.experimental.memoryImprovements.features.autoReload', 'Auto-reload Protection')}
              description={t('settings.experimental.memoryImprovements.features.autoReloadDesc',
                'Automatically reloads tabs approaching 3.8GB memory limit (Chromium hard limit is ~4GB). Monitors growth rate and predicts crashes. Minimum 10 minutes between reloads to avoid disruption.')}
              checked={memorySettings.features.autoReload}
              onChange={handleFeatureToggle('autoReload')}
            />

            <MemoryToggle
              label={t('settings.experimental.memoryImprovements.features.domOptimization', 'DOM Optimization')}
              description={t('settings.experimental.memoryImprovements.features.domOptimizationDesc',
                'Removes hidden elements after 5 minutes, lazy-loads off-screen images, cleans unused CSS rules, and trims large text nodes. Runs every 2 minutes and can save 10-100MB per optimization.')}
              checked={memorySettings.features.domOptimization}
              onChange={handleFeatureToggle('domOptimization')}
            />

            <MemoryToggle
              label={t('settings.experimental.memoryImprovements.features.websocket', 'WebSocket Management')}
              description={t('settings.experimental.memoryImprovements.features.websocketDesc',
                'Closes idle WebSocket connections after 5 minutes of inactivity. Properly handles sleep/resume cycles by closing all connections before sleep and reconnecting after. Prevents connection leaks that can consume 50-100KB each.')}
              checked={memorySettings.features.websocket}
              onChange={handleFeatureToggle('websocket')}
            />
          </Box>
        </>
      )}
    </>
  );
};