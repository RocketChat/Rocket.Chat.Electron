import { listen } from '../store';
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

  // Listen for master toggle
  listen(EXPERIMENTAL_MEMORY_IMPROVEMENTS_TOGGLED, async (action) => {
    const { enabled } = action.payload;
    console.log(`[ExperimentalRedux] Memory improvements toggled: ${enabled}`);
    
    if (enabled) {
      await memoryManager.enable();
    } else {
      await memoryManager.disable();
    }
  });

  // Listen for individual feature toggles
  listen(EXPERIMENTAL_MEMORY_FEATURE_TOGGLED, async (action) => {
    const { feature, enabled } = action.payload;
    console.log(`[ExperimentalRedux] Feature ${feature} toggled: ${enabled}`);
    
    await memoryManager.toggleFeature(feature, enabled);
  });

  console.log('[ExperimentalRedux] Redux listeners registered');
};