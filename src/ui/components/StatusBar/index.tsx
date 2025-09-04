import { Box } from '@rocket.chat/fuselage';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import type { RootState } from '../../../store/rootReducer';
import { invoke } from '../../../ipc/renderer';

interface MemoryInfo {
  totalMemory: number;
  pressure: 'low' | 'medium' | 'high';
  rendererProcesses: number;
  activeServers: number;
  mainProcessMemory: number;
}

export const StatusBar = () => {
  const { t } = useTranslation();
  const [memoryInfo, setMemoryInfo] = useState<MemoryInfo | null>(null);
  const [updateTime, setUpdateTime] = useState<Date>(new Date());
  
  // Check if memory monitoring is enabled and status bar should show
  const memorySettings = useSelector(
    (state: RootState) => state.experimentalFeatures?.memoryImprovements
  );
  
  const isEnabled = memorySettings?.enabled && 
                   memorySettings?.features?.monitoring &&
                   memorySettings?.showStatusBar;

  useEffect(() => {
    if (!isEnabled) {
      setMemoryInfo(null);
      return;
    }

    const fetchMemoryInfo = async () => {
      try {
        const data = await invoke('experimental/request-memory-metrics');
        if (data) {
          setMemoryInfo({
            totalMemory: data.app?.totalMemory || 0,
            pressure: data.app?.pressure || 'low',
            rendererProcesses: data.app?.rendererProcesses || 0,
            activeServers: data.webviews?.length || 0,
            mainProcessMemory: data.app?.mainProcess?.rss || 0
          });
          setUpdateTime(new Date());
        }
      } catch (error) {
        // Silently handle errors
      }
    };

    // Fetch initial data
    fetchMemoryInfo();
    
    // Update every 10 seconds for real-time monitoring
    const interval = setInterval(fetchMemoryInfo, 10000);

    return () => clearInterval(interval);
  }, [isEnabled]);

  if (!isEnabled || !memoryInfo) {
    return null;
  }

  const formatMemory = (bytes: number): string => {
    const mb = bytes / 1024 / 1024;
    if (mb < 1024) {
      return `${mb.toFixed(0)}MB`;
    }
    const gb = mb / 1024;
    return `${gb.toFixed(1)}GB`;
  };

  const getPressureColor = (pressure: string): string => {
    switch (pressure) {
      case 'high': return '#f5455c'; // danger
      case 'medium': return '#f38c39'; // warning  
      default: return '#2de0a5'; // success
    }
  };

  const getPressureIcon = (pressure: string): string => {
    switch (pressure) {
      case 'high': return '⚠️';
      case 'medium': return '⚡';
      default: return '✓';
    }
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <Box
      position='fixed'
      bottom='0'
      left='0'
      right='0'
      height='x24'
      bg='surface-light'
      borderBlockStart='1px solid'
      borderColor='stroke-extra-light'
      display='flex'
      alignItems='center'
      justifyContent='space-between'
      paddingInline='x12'
      zIndex={1000}
      fontScale='c1'
      color='hint'
    >
      {/* Left section - Memory status */}
      <Box display='flex' alignItems='center' gap='x16'>
        <Box display='flex' alignItems='center' gap='x4'>
          <span>{getPressureIcon(memoryInfo.pressure)}</span>
          <Box color={getPressureColor(memoryInfo.pressure)} fontWeight='500'>
            {formatMemory(memoryInfo.totalMemory)}
          </Box>
        </Box>
        
        <Box display='flex' alignItems='center' gap='x8'>
          <Box>
            {t('Main')}: {formatMemory(memoryInfo.mainProcessMemory)}
          </Box>
          <Box color='stroke-light'>•</Box>
          <Box>
            {t('Renderers')}: {memoryInfo.rendererProcesses}
          </Box>
          <Box color='stroke-light'>•</Box>
          <Box>
            {t('Servers')}: {memoryInfo.activeServers}
          </Box>
        </Box>
      </Box>

      {/* Right section - Update time */}
      <Box display='flex' alignItems='center' gap='x8'>
        <Box color='hint' fontScale='micro'>
          {t('Updated')}: {formatTime(updateTime)}
        </Box>
      </Box>
    </Box>
  );
};