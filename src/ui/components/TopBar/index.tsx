import { Box } from '@rocket.chat/fuselage';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import type { RootState } from '../../../store/rootReducer';
import { invoke } from '../../../ipc/renderer';

interface MemoryMetrics {
  totalAppMemory: number;
  pressure: 'low' | 'medium' | 'high';
  serverCount: number;
}

export const TopBar = () => {
  const mainWindowTitle = useSelector(
    ({ mainWindowTitle }: RootState) => mainWindowTitle
  );
  
  const [metrics, setMetrics] = useState<MemoryMetrics | null>(null);
  
  // Check if memory monitoring is enabled and status bar should show
  const memorySettings = useSelector(
    (state: RootState) => state.experimentalFeatures?.memoryImprovements
  );
  
  const showMemoryStatus = memorySettings?.enabled && 
                          memorySettings?.features?.monitoring &&
                          memorySettings?.showStatusBar;

  useEffect(() => {
    if (!showMemoryStatus) {
      setMetrics(null);
      return;
    }

    // Request metrics via IPC
    const requestMetrics = async () => {
      try {
        const data = await invoke('experimental/request-memory-metrics');
        if (data) {
          setMetrics({
            totalAppMemory: data.app?.totalMemory || 0,
            pressure: data.app?.pressure || 'low',
            serverCount: data.webviews?.length || 0
          });
        }
      } catch (error) {
        console.error('[TopBar] Failed to get memory metrics:', error);
      }
    };

    // Request initial metrics
    requestMetrics();
    
    // Request metrics every 30 seconds (lighter than full monitoring)
    const interval = setInterval(requestMetrics, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [showMemoryStatus]);

  const formatMemory = (bytes: number): string => {
    const mb = bytes / 1024 / 1024;
    if (mb < 1024) {
      return `${mb.toFixed(0)}MB`;
    }
    const gb = mb / 1024;
    return `${gb.toFixed(1)}GB`;
  };

  // Build the display title with memory info appended
  const displayTitle = showMemoryStatus && metrics 
    ? `${mainWindowTitle} • ${formatMemory(metrics.totalAppMemory)}`
    : mainWindowTitle;

  return (
    <Box
      className='rcx-sidebar--main'
      height='x28'
      display='flex'
      flexDirection='row'
      justifyContent='center'
      alignItems='center'
      color='default'
      bg='tint'
      width='100%'
    >
      <Box fontScale='p2'>{displayTitle}</Box>
    </Box>
  );
};
