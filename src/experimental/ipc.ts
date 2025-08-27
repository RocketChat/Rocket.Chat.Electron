import { handle } from '../ipc/main';
import { ExperimentalMemoryManager } from './ExperimentalMemoryManager';

/**
 * Set up IPC handlers for experimental features.
 */
export const setupExperimentalIPC = (): void => {
  const memoryManager = ExperimentalMemoryManager.getInstance();

  // Toggle all memory improvements
  handle('experimental/toggle-memory-improvements', async (_webContents, enabled) => {
    console.log(`[ExperimentalIPC] Toggle memory improvements: ${enabled}`);
    
    if (enabled) {
      await memoryManager.enable();
    } else {
      await memoryManager.disable();
    }
  });

  // Toggle specific feature
  handle('experimental/toggle-memory-feature', async (_webContents, feature, enabled) => {
    console.log(`[ExperimentalIPC] Toggle feature ${feature}: ${enabled}`);
    
    await memoryManager.toggleFeature(feature, enabled);
  });

  // Get memory metrics
  handle('experimental/get-memory-metrics', async () => {
    const metrics = memoryManager.getMetrics();
    console.log('[ExperimentalIPC] Getting memory metrics:', metrics);
    
    return metrics;
  });

  console.log('[ExperimentalIPC] IPC handlers registered');
};