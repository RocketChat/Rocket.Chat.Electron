import { ipcRenderer } from 'electron';
import { invoke } from '../ipc/renderer';

export type ExperimentalAPI = {
  requestMemoryMetrics: () => Promise<void>;
  navigateToSettings: (tab?: string) => void;
};

export const experimental: ExperimentalAPI = {
  requestMemoryMetrics: async () => {
    const metrics = await invoke('experimental/request-memory-metrics');
    
    // Dispatch custom event with metrics
    if (metrics) {
      window.dispatchEvent(new CustomEvent('memory-metrics-update', { 
        detail: { metrics } 
      }));
    }
  },
  
  navigateToSettings: (tab = 'general') => {
    // Navigate to settings view with specific tab
    ipcRenderer.send('navigate-to-settings', tab);
  }
};