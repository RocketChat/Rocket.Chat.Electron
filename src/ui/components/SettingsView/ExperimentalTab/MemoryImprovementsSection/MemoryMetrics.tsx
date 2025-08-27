import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Margins, Tile, ProgressBar, Tag } from '@rocket.chat/fuselage';
import { invoke } from '../../../../../ipc/renderer';

interface LiveMetrics {
  timestamp: number;
  system: {
    total: number;
    free: number;
    used: number;
    percentUsed: number;
    pressure: 'low' | 'medium' | 'high' | 'critical';
  };
  electron: {
    totalAppMemory: number;
    webviews: Array<{
      url: string;
      memory: number;
    }>;
  };
  features: {
    memorySaved: number;
    interventions: number;
    lastCleanup: number;
  };
}

interface MemoryMetricsProps {
  metrics?: any; // Legacy prop for compatibility
}

export const MemoryMetrics: React.FC<MemoryMetricsProps> = () => {
  const { t } = useTranslation();
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics | null>(null);
  const [updateTime, setUpdateTime] = useState<number>(Date.now());

  useEffect(() => {
    // Request initial metrics
    const requestMetrics = async () => {
      console.log('[MemoryMetrics] Requesting metrics via IPC');
      try {
        const metrics = await invoke('experimental/request-memory-metrics');
        console.log('[MemoryMetrics] Got metrics:', metrics);
        
        if (metrics) {
          setLiveMetrics({
            timestamp: Date.now(),
            system: metrics.system || {},
            electron: metrics.electron || {},
            features: metrics.features || {
              memorySaved: 0,
              interventions: 0,
              lastCleanup: 0
            }
          });
        }
      } catch (error) {
        console.error('[MemoryMetrics] Failed to get metrics:', error);
      }
      setUpdateTime(Date.now());
    };

    requestMetrics();
    
    // Update every 30 seconds
    const interval = setInterval(requestMetrics, 30000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const formatMemory = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 MB';
    const mb = bytes / 1024 / 1024;
    if (mb < 1024) {
      return `${mb.toFixed(0)} MB`;
    }
    const gb = mb / 1024;
    return `${gb.toFixed(2)} GB`;
  };

  const formatTime = (timestamp: number): string => {
    if (!timestamp || timestamp === 0) return t('settings.experimental.memoryImprovements.metrics.never', 'Never');
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return t('settings.experimental.memoryImprovements.metrics.justNow', 'Just now');
    if (diffMins < 60) return `${diffMins} ${t('settings.experimental.memoryImprovements.metrics.minutesAgo', 'min ago')}`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} ${t('settings.experimental.memoryImprovements.metrics.hoursAgo', 'hr ago')}`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ${t('settings.experimental.memoryImprovements.metrics.daysAgo', 'days ago')}`;
  };

  const getPressureColor = (pressure: string): string => {
    switch (pressure) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'primary';
      default: return 'success';
    }
  };

  const getProgressColor = (percent: number): string => {
    if (percent >= 90) return 'danger';
    if (percent >= 75) return 'warning';
    if (percent >= 60) return 'primary';
    return 'success';
  };

  if (!liveMetrics) {
    return (
      <Margins block='x16'>
        <Box fontScale='h4' mbe='x16'>
          {t('settings.experimental.memoryImprovements.metrics.title', 'Memory Status')}
        </Box>
        <Box fontScale='p2' color='hint'>
          {t('settings.experimental.memoryImprovements.metrics.loading', 'Loading memory data...')}
        </Box>
      </Margins>
    );
  }

  const systemUsagePercent = liveMetrics.system.percentUsed || 0;
  const appMemoryGB = (liveMetrics.electron.totalAppMemory || 0) / 1024 / 1024 / 1024;
  const serverCount = liveMetrics.electron.webviews?.length || 0;

  return (
    <Margins block='x16'>
      <Box display='flex' alignItems='center' justifyContent='space-between' mbe='x16'>
        <Box fontScale='h4'>
          {t('settings.experimental.memoryImprovements.metrics.title', 'Memory Status')}
        </Box>
        <Box fontScale='c1' color='hint'>
          {t('settings.experimental.memoryImprovements.metrics.updated', 'Updated')}: {formatTime(updateTime)}
        </Box>
      </Box>

      {/* System Memory Overview */}
      <Tile elevation='1' padding='x16' mbe='x16'>
        <Box mbe='x8'>
          <Box display='flex' justifyContent='space-between' alignItems='center' mbe='x8'>
            <Box fontScale='p2'>
              {t('settings.experimental.memoryImprovements.metrics.systemMemory', 'System Memory')}
            </Box>
            <Tag variant={getPressureColor(liveMetrics.system.pressure)}>
              {liveMetrics.system.pressure.toUpperCase()}
            </Tag>
          </Box>
          <ProgressBar 
            percentage={systemUsagePercent} 
            variant={getProgressColor(systemUsagePercent)}
          />
          <Box display='flex' justifyContent='space-between' mbs='x4'>
            <Box fontScale='c1' color='hint'>
              {formatMemory(liveMetrics.system.used)} / {formatMemory(liveMetrics.system.total)}
            </Box>
            <Box fontScale='c1' color='hint'>
              {systemUsagePercent.toFixed(1)}%
            </Box>
          </Box>
        </Box>
      </Tile>

      {/* App Memory Stats */}
      <Box display='flex' flexWrap='wrap' mi='neg-x8' mbe='x16'>
        <Box pi='x8' width='50%'>
          <Tile elevation='1' padding='x16'>
            <Box textAlign='center'>
              <Box fontScale='h2' color='info-500' mbe='x4'>
                {formatMemory(liveMetrics.electron.totalAppMemory)}
              </Box>
              <Box fontScale='c1' color='hint'>
                {t('settings.experimental.memoryImprovements.metrics.totalAppMemory', 'App Memory')}
              </Box>
            </Box>
          </Tile>
        </Box>
        
        <Box pi='x8' width='50%'>
          <Tile elevation='1' padding='x16'>
            <Box textAlign='center'>
              <Box fontScale='h2' color='success-500' mbe='x4'>
                {serverCount}
              </Box>
              <Box fontScale='c1' color='hint'>
                {t('settings.experimental.memoryImprovements.metrics.activeServers', 'Active Servers')}
              </Box>
            </Box>
          </Tile>
        </Box>
      </Box>

      {/* Server Memory Breakdown */}
      {liveMetrics.electron.webviews && liveMetrics.electron.webviews.length > 0 && (
        <Tile elevation='1' padding='x16'>
          <Box fontScale='p2' mbe='x12'>
            {t('settings.experimental.memoryImprovements.metrics.serverBreakdown', 'Server Memory Usage')}
          </Box>
          {liveMetrics.electron.webviews.slice(0, 5).map((webview, index) => {
            const serverName = new URL(webview.url).hostname;
            const memoryPercent = (webview.memory / liveMetrics.electron.totalAppMemory) * 100;
            return (
              <Box key={index} mbe={index < liveMetrics.electron.webviews.length - 1 ? 'x8' : undefined}>
                <Box display='flex' justifyContent='space-between' mbe='x4'>
                  <Box fontScale='c1' withTruncatedText>
                    {serverName}
                  </Box>
                  <Box fontScale='c1' color='hint'>
                    {formatMemory(webview.memory)}
                  </Box>
                </Box>
                <ProgressBar 
                  percentage={memoryPercent} 
                  variant='primary'
                />
              </Box>
            );
          })}
        </Tile>
      )}

      {/* Feature Stats */}
      {liveMetrics.features && (liveMetrics.features.interventions > 0 || liveMetrics.features.memorySaved > 0) && (
        <Box display='flex' flexWrap='wrap' mi='neg-x8' mbs='x16'>
          <Box pi='x8' width='33.33%'>
            <Box textAlign='center'>
              <Box fontScale='p1' color='success-500'>
                {formatMemory(liveMetrics.features.memorySaved)}
              </Box>
              <Box fontScale='c1' color='hint'>
                {t('settings.experimental.memoryImprovements.metrics.saved', 'Saved')}
              </Box>
            </Box>
          </Box>
          <Box pi='x8' width='33.33%'>
            <Box textAlign='center'>
              <Box fontScale='p1' color='info-500'>
                {liveMetrics.features.interventions}
              </Box>
              <Box fontScale='c1' color='hint'>
                {t('settings.experimental.memoryImprovements.metrics.cleanups', 'Cleanups')}
              </Box>
            </Box>
          </Box>
          <Box pi='x8' width='33.33%'>
            <Box textAlign='center'>
              <Box fontScale='p1'>
                {formatTime(liveMetrics.features.lastCleanup)}
              </Box>
              <Box fontScale='c1' color='hint'>
                {t('settings.experimental.memoryImprovements.metrics.lastRun', 'Last Run')}
              </Box>
            </Box>
          </Box>
        </Box>
      )}
    </Margins>
  );
};