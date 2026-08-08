import { Box } from '@rocket.chat/fuselage';
import { useTranslation } from 'react-i18next';

import { StatusItem } from './StatusItem';
import type { Surfaces } from './appearance';

export type LogStatusBarProps = {
  surfaces: Surfaces;
  shownCount: number;
  loadedCount: number;
  fileSize?: string;
  dateRange?: string;
  filePath?: string;
  isStreaming: boolean;
  isLoading: boolean;
};

export const LogStatusBar = ({
  surfaces,
  shownCount,
  loadedCount,
  fileSize,
  dateRange,
  filePath,
  isStreaming,
  isLoading,
}: LogStatusBarProps) => {
  const { t } = useTranslation();

  return (
    <Box
      display='flex'
      flexDirection='row'
      alignItems='center'
      flexShrink={0}
      paddingInline='x12'
      paddingBlock='x4'
      fontScale='micro'
      color='hint'
      style={{
        backgroundColor: surfaces.chrome,
        borderBlockStart: `1px solid ${surfaces.divider}`,
        userSelect: 'none',
      }}
    >
      <StatusItem icon='hash'>
        {shownCount === loadedCount
          ? t('logViewer.fileInfo.entries', { count: shownCount })
          : t('logViewer.fileInfo.entriesOfTotal', {
              count: shownCount,
              total: loadedCount,
            })}
      </StatusItem>
      {fileSize && <StatusItem icon='file'>{fileSize}</StatusItem>}
      {dateRange && <StatusItem icon='clock'>{dateRange}</StatusItem>}
      <Box flexGrow={1} />
      {isLoading && (
        <Box marginInlineStart='x8'>{t('logViewer.status.loading')}</Box>
      )}
      {isStreaming && (
        <Box
          display='flex'
          alignItems='center'
          marginInlineStart='x8'
          color='status-font-on-success'
          title={filePath}
        >
          <Box
            width='x8'
            height='x8'
            borderRadius='full'
            marginInlineEnd='x4'
            style={{
              backgroundColor: 'var(--rcx-color-status-font-on-success)',
            }}
          />
          {t('logViewer.status.live')}
        </Box>
      )}
    </Box>
  );
};
