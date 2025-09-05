import { ipcRenderer } from 'electron';

import { invoke } from '../ipc/renderer';

export type ExperimentalAPI = {
  requestMemoryMetrics: () => Promise<void>;
  navigateToSettings: (tab?: string) => void;
};

export const experimental: ExperimentalAPI = {
  requestMemoryMetrics: async () => {
    console.log('[Experimental] Requesting memory metrics from main process');
    const metrics = await invoke('experimental/request-memory-metrics');

    // Dispatch custom event with metrics
    if (metrics) {
      console.log('[Experimental] Got metrics, dispatching event', metrics);
      window.dispatchEvent(
        new CustomEvent('memory-metrics-update', {
          detail: { metrics },
        })
      );
    } else {
      console.log('[Experimental] No metrics received');
    }
  },

  navigateToSettings: (tab = 'general') => {
    // Navigate to settings view with specific tab
    ipcRenderer.send('navigate-to-settings', tab);
  },
};
