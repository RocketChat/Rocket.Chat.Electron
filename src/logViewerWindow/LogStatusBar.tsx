import { Box, StatusBullet } from '@rocket.chat/fuselage';
import { useTranslation } from 'react-i18next';

import { StatusBar } from '../ui/windowChrome/StatusBar';
import { StatusItem } from '../ui/windowChrome/StatusItem';
import { TextButton } from '../ui/windowChrome/TextButton';

export type LogStatusBarProps = {
  shownCount: number;
  loadedCount: number;
  fileSize?: string;
  dateRange?: string;
  filePath?: string;
  isStreaming: boolean;
  isLoading: boolean;
  canClear: boolean;
  onClearLogs: () => void;
};

export const LogStatusBar = ({
  shownCount,
  loadedCount,
  fileSize,
  dateRange,
  filePath,
  isStreaming,
  isLoading,
  canClear,
  onClearLogs,
}: LogStatusBarProps) => {
  const { t } = useTranslation();

  return (
    <StatusBar
      action={
        canClear && (
          <TextButton danger onClick={onClearLogs}>
            {t('logViewer.buttons.clear')}
          </TextButton>
        )
      }
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
          <Box display='flex' marginInlineEnd='x4'>
            <StatusBullet status='online' size='small' />
          </Box>
          {t('logViewer.status.live')}
        </Box>
      )}
    </StatusBar>
  );
};
