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
    
    // Master toggle only enables/disables the manager
    // Individual features need to be enabled separately
    if (enabled) {
      // Enable manager but don't enable any features yet
      console.log('[ExperimentalRedux] Manager enabled, features remain disabled until manually activated');
    } else {
      // Disable everything
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