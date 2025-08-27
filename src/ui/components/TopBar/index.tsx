import { Box } from '@rocket.chat/fuselage';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import type { RootState } from '../../../store/rootReducer';

interface MemoryMetrics {
  totalAppMemory: number;
  pressure: 'low' | 'medium' | 'high' | 'critical';
  systemPercent: number;
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

    // Listen for memory updates from main process
    const handleMemoryUpdate = (_event: any, data: any) => {
      if (data && data.metrics) {
        setMetrics({
          totalAppMemory: data.metrics.electron?.totalAppMemory || 0,
          pressure: data.metrics.system?.pressure || 'low',
          systemPercent: data.metrics.system?.percentUsed || 0,
          serverCount: data.metrics.electron?.webviews?.length || 0
        });
      }
    };

    // Request initial metrics
    window.RocketChatDesktop?.experimental?.requestMemoryMetrics?.();
    
    // Listen for updates
    window.addEventListener('memory-metrics-update', handleMemoryUpdate);
    
    // Request metrics every 30 seconds (lighter than full monitoring)
    const interval = setInterval(() => {
      window.RocketChatDesktop?.experimental?.requestMemoryMetrics?.();
    }, 30000);

    return () => {
      window.removeEventListener('memory-metrics-update', handleMemoryUpdate);
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
    ? `${mainWindowTitle} • ${formatMemory(metrics.totalAppMemory)} • ${metrics.pressure.toUpperCase()}`
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
