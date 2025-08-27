import React from 'react';
import { useTranslation } from 'react-i18next';

import { Box, Margins, Tile } from '@rocket.chat/fuselage';

interface MemoryMetricsProps {
  metrics: {
    memorySaved: number;
    interventions: number;
    lastCleanup: number;
  };
}

export const MemoryMetrics: React.FC<MemoryMetricsProps> = ({ metrics }) => {
  const { t } = useTranslation();

  const formatMemory = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatTime = (timestamp: number): string => {
    if (timestamp === 0) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  };

  return (
    <Margins block='x16'>
      <Box fontScale='h4'>
        {t('settings.experimental.memoryImprovements.metrics.title', 'Performance Metrics')}
      </Box>
      
      <Tile elevation='1' padding='x16'>
        <Box display='flex' flexWrap='wrap' mi='neg-x8'>
          <Box pi='x8' width='33.33%' minWidth='x200'>
            <Box textAlign='center'>
              <Box fontScale='h2' color='info-500' mbe='x4'>
                {formatMemory(metrics.memorySaved)}
              </Box>
              <Box fontScale='c1' color='hint'>
                {t('settings.experimental.memoryImprovements.metrics.memorySaved', 'Memory Saved')}
              </Box>
            </Box>
          </Box>
          
          <Box pi='x8' width='33.33%' minWidth='x200'>
            <Box textAlign='center'>
              <Box fontScale='h2' color='success-500' mbe='x4'>
                {metrics.interventions}
              </Box>
              <Box fontScale='c1' color='hint'>
                {t('settings.experimental.memoryImprovements.metrics.interventions', 'Interventions')}
              </Box>
            </Box>
          </Box>
          
          <Box pi='x8' width='33.33%' minWidth='x200'>
            <Box textAlign='center'>
              <Box fontScale='p2' mbe='x4'>
                {formatTime(metrics.lastCleanup)}
              </Box>
              <Box fontScale='c1' color='hint'>
                {t('settings.experimental.memoryImprovements.metrics.lastCleanup', 'Last Cleanup')}
              </Box>
            </Box>
          </Box>
        </Box>
      </Tile>
    </Margins>
  );
};