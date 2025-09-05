import { webContents } from 'electron';

import { handle } from '../ipc/main';
import { ExperimentalMemoryManager } from './ExperimentalMemoryManager';
import type { MemoryMonitor } from './features/MemoryMonitor';

/**
 * Set up IPC handlers for experimental features.
 */
export const setupExperimentalIPC = (): void => {
  const memoryManager = ExperimentalMemoryManager.getInstance();

  // Toggle all memory improvements
  handle(
    'experimental/toggle-memory-improvements',
    async (_webContents, enabled) => {
      if (enabled) {
        await memoryManager.enable();
        // Enable monitoring by default when memory improvements are enabled
        await memoryManager.toggleFeature('monitoring', true);
      } else {
        await memoryManager.disable();
      }
    }
  );

  // Toggle specific feature
  handle(
    'experimental/toggle-memory-feature',
    async (_webContents, feature, enabled) => {
      // Handle special case for showStatusBar
      if (feature === 'showStatusBar') {
        // This is just a UI toggle, no feature to enable/disable
        return;
      }

      await memoryManager.toggleFeature(feature, enabled);
    }
  );

  // Get memory metrics
  handle('experimental/get-memory-metrics', async () => {
    return memoryManager.getMetrics();
  });

  // Request current memory metrics
  handle('experimental/request-memory-metrics', async () => {
    const monitoringFeature = memoryManager.getFeature('monitoring') as
      | MemoryMonitor
      | undefined;

    if (!monitoringFeature || !monitoringFeature.isEnabled()) {
      return null;
    }

    // Force a snapshot and get current state
    const snapshot = await monitoringFeature.forceSnapshot();
    const metrics = {
      app: snapshot.app,
      webviews: snapshot.webviews,
      features: memoryManager.getMetrics(),
    };

    // Send to all webContents
    webContents.getAllWebContents().forEach((wc) => {
      if (!wc.isDestroyed()) {
        wc.send('memory-metrics-update', { metrics });
      }
    });

    return metrics;
  });

  // IPC handlers registered
};
