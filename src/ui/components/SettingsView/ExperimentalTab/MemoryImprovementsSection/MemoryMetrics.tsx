import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Margins, Tile, ProgressBar, Tag } from '@rocket.chat/fuselage';
import { invoke } from '../../../../../ipc/renderer';

interface LiveMetrics {
  timestamp: number;
  app: {
    totalMemory: number;
    mainProcess: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
    };
    rendererProcesses: number;
    pressure: 'low' | 'medium' | 'high';
  };
  webviews: Array<{
    url: string;
    memory: number;
  }>;
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
            app: metrics.app || {},
            webviews: metrics.webviews || [],
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
    if (!timestamp || timestamp === 0) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: false 
    });
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
      <Box marginBlock='x24'>
        <Box fontScale='p2b' mbe='x12'>
          {t('settings.experimental.memoryImprovements.metrics.title', 'Memory Status')}
        </Box>
        <Box fontScale='p2' color='hint'>
          {t('settings.experimental.memoryImprovements.metrics.loading', 'Loading memory data...')}
        </Box>
      </Box>
    );
  }

  const appMemoryMB = (liveMetrics.app.totalMemory || 0) / 1024 / 1024;
  const mainProcessMB = (liveMetrics.app.mainProcess?.rss || 0) / 1024 / 1024;

  return (
    <Box marginBlock='x24'>
      <Box display='flex' alignItems='center' justifyContent='space-between' mbe='x12'>
        <Box fontScale='p2b' color='default'>
          {t('settings.experimental.memoryImprovements.metrics.title', 'Memory Status')}
        </Box>
        {formatTime(updateTime) && (
          <Box fontScale='c1' color='hint'>
            {formatTime(updateTime)}
          </Box>
        )}
      </Box>

      {/* App Memory Overview */}
      <Tile elevation='1' padding='x16' mbe='x16'>
        <Box mbe='x8'>
          <Box display='flex' justifyContent='space-between' alignItems='center' mbe='x8'>
            <Box fontScale='p2'>
              {t('settings.experimental.memoryImprovements.metrics.appMemory', 'Application Memory')}
            </Box>
            <Tag variant={getPressureColor(liveMetrics.app.pressure)}>
              {liveMetrics.app.pressure.toUpperCase()}
            </Tag>
          </Box>
          <Box display='flex' justifyContent='space-between' mbs='x4'>
            <Box>
              <Box fontScale='h3'>
                {formatMemory(liveMetrics.app.totalMemory)}
              </Box>
              <Box fontScale='c1' color='hint'>
                {t('settings.experimental.memoryImprovements.metrics.totalUsage', 'Total usage')}
              </Box>
            </Box>
            <Box textAlign='right'>
              <Box fontScale='p1'>
                {formatMemory(liveMetrics.app.mainProcess?.rss || 0)}
              </Box>
              <Box fontScale='c1' color='hint'>
                {t('settings.experimental.memoryImprovements.metrics.mainProcess', 'Main process')}
              </Box>
            </Box>
          </Box>
        </Box>
      </Tile>

      {/* Server Memory Breakdown - only show if there are servers */}
      {liveMetrics.webviews && liveMetrics.webviews.length > 0 && (
        <Tile elevation='1' padding='x16'>
          <Box fontScale='p2' mbe='x12'>
            {t('settings.experimental.memoryImprovements.metrics.serverBreakdown', 'Server Memory Usage')}
          </Box>
          {liveMetrics.webviews.slice(0, 5).map((webview, index) => {
            const serverName = new URL(webview.url).hostname;
            const memoryPercent = (webview.memory / liveMetrics.app.totalMemory) * 100;
            return (
              <Box key={index} mbe={index < liveMetrics.webviews.length - 1 ? 'x8' : undefined}>
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
    </Box>
  );
};