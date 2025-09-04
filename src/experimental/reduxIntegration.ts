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
    if (settings) {
      console.log('[ExperimentalRedux] Restoring persisted settings:', settings);
      
      // Enable manager if it was enabled
      if (settings.enabled) {
        console.log('[ExperimentalRedux] Manager was enabled, restoring state');
        await memoryManager.enable();
        
        // Enable monitoring by default (always needed for metrics)
        await memoryManager.toggleFeature('monitoring', true);
        
        // Now restore other individual feature states
        for (const [feature, enabled] of Object.entries(settings.features)) {
          if (enabled && feature !== 'monitoring') {
            console.log(`[ExperimentalRedux] Restoring feature ${feature} as enabled`);
            await memoryManager.toggleFeature(feature, true);
          }
        }
        console.log('[ExperimentalRedux] All features restored');
      }
    }
  });

  // Listen for master toggle
  listen(EXPERIMENTAL_MEMORY_IMPROVEMENTS_TOGGLED, async (action) => {
    const { enabled } = action.payload;
    console.log(`[ExperimentalRedux] Memory improvements toggled: ${enabled}`);
    
    if (enabled) {
      // Enable manager
      await memoryManager.enable();
      // Enable monitoring by default when memory improvements are toggled on
      await memoryManager.toggleFeature('monitoring', true);
      console.log('[ExperimentalRedux] Manager enabled with monitoring feature');
    } else {
      // Disable everything
      await memoryManager.disable();
    }
  });

  // Listen for individual feature toggles
  listen(EXPERIMENTAL_MEMORY_FEATURE_TOGGLED, async (action) => {
    const { feature, enabled } = action.payload;
    console.log(`[ExperimentalRedux] Feature ${feature} toggled: ${enabled}`);
    
    const result = await memoryManager.toggleFeature(feature, enabled);
    console.log(`[ExperimentalRedux] Feature ${feature} toggle result:`, result);
  });

  console.log('[ExperimentalRedux] Redux listeners registered');
};