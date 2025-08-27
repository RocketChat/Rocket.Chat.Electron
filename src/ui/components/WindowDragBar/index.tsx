import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import styled from '@emotion/styled';
import { Box } from '@rocket.chat/fuselage';
import type { RootState } from '../../../store/rootReducer';

const DragBar = styled.div`
  position: fixed;
  width: 100vw;
  height: 22px;
  -webkit-app-region: drag;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const MemoryInfo = styled.div<{ pressure: string }>`
  -webkit-app-region: no-drag;
  font-size: 11px;
  font-family: system-ui, -apple-system, sans-serif;
  color: ${props => {
    switch (props.pressure) {
      case 'critical': return '#ff3030';
      case 'high': return '#ff8c00';
      case 'medium': return '#ffa500';
      default: return 'rgba(255, 255, 255, 0.6)';
    }
  }};
  padding: 0 8px;
  height: 18px;
  line-height: 18px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.8;
    background: rgba(0, 0, 0, 0.3);
  }
`;

const MemoryValue = styled.span`
  font-weight: 500;
`;

const Separator = styled.span`
  opacity: 0.5;
`;

interface MemoryMetrics {
  totalAppMemory: number;
  pressure: 'low' | 'medium' | 'high' | 'critical';
  systemPercent: number;
  serverCount: number;
}

export const WindowDragBar: React.FC = () => {
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

  const handleClick = () => {
    // Navigate to experimental settings
    window.RocketChatDesktop?.navigateToSettings?.('experimental');
  };

  if (process.platform !== 'darwin') {
    return null;
  }

  return (
    <DragBar>
      {showMemoryStatus && metrics && (
        <MemoryInfo 
          pressure={metrics.pressure}
          onClick={handleClick}
          title={`System: ${metrics.systemPercent.toFixed(1)}% | ${metrics.serverCount} server${metrics.serverCount !== 1 ? 's' : ''} | Click for details`}
        >
          <MemoryValue>{formatMemory(metrics.totalAppMemory)}</MemoryValue>
          <Separator>•</Separator>
          <span>{metrics.pressure === 'low' ? '✓' : metrics.pressure.toUpperCase()}</span>
        </MemoryInfo>
      )}
    </DragBar>
  );
};