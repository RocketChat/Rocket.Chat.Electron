import { listen } from '../store';
import { APP_SETTINGS_LOADED } from '../app/actions';
import {
  EXPERIMENTAL_MEMORY_IMPROVEMENTS_TOGGLED,
  EXPERIMENTAL_MEMORY_FEATURE_TOGGLED,
} from '../ui/actions';
import { ExperimentalMemoryManager } from './ExperimentalMemoryManager';

/**
 * Set up listeners for Redux actions related to experimental features.
 */
export const setupExperimentalReduxListeners = (): void => {
  const memoryManager = ExperimentalMemoryManager.getInstance();

  // Listen for settings loaded to restore persisted state
  listen(APP_SETTINGS_LOADED, async (action) => {
    const settings = action.payload.experimentalMemoryImprovements;
    if (settings && settings.enabled) {
      await memoryManager.enable();
      
      // Enable monitoring by default (always needed for metrics)
      await memoryManager.toggleFeature('monitoring', true);
      
      // Now restore other individual feature states
      for (const [feature, enabled] of Object.entries(settings.features)) {
        if (enabled && feature !== 'monitoring') {
          await memoryManager.toggleFeature(feature, true);
        }
      }
    }
  });

  // Listen for master toggle
  listen(EXPERIMENTAL_MEMORY_IMPROVEMENTS_TOGGLED, async (action) => {
    const { enabled } = action.payload;
    
    if (enabled) {
      await memoryManager.enable();
      // Enable monitoring by default when memory improvements are toggled on
      await memoryManager.toggleFeature('monitoring', true);
    } else {
      await memoryManager.disable();
    }
  });

  // Listen for individual feature toggles
  listen(EXPERIMENTAL_MEMORY_FEATURE_TOGGLED, async (action) => {
    const { feature, enabled } = action.payload;
    await memoryManager.toggleFeature(feature, enabled);
  });

  // Redux listeners registered
};