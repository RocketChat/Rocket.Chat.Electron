import { Box, ButtonGroup, Icon, IconButton, Tag } from '@rocket.chat/fuselage';
import { useTranslation } from 'react-i18next';

import { WindowToolbar } from '../ui/windowChrome/WindowToolbar';
import { NO_DRAG_REGION_CLASS } from '../ui/windowChrome/styles';
import { useCopiedFeedback } from '../ui/windowChrome/useCopiedFeedback';

export type LogViewerToolbarProps = {
  fileName: string;
  filePath?: string;
  isDefaultLog: boolean;
  isLoading: boolean;
  isStreaming: boolean;
  onOpenLogFile: () => void;
  onOpenDefaultLog: () => void;
  onRefresh: () => void;
  onToggleStreaming: () => void;
  onCopy: () => void;
  onSave: () => void;
};

export const LogViewerToolbar = ({
  fileName,
  filePath,
  isDefaultLog,
  isLoading,
  isStreaming,
  onOpenLogFile,
  onOpenDefaultLog,
  onRefresh,
  onToggleStreaming,
  onCopy,
  onSave,
}: LogViewerToolbarProps) => {
  const { t } = useTranslation();
  const [hasCopied, acknowledgeCopy] = useCopiedFeedback();

  return (
    <WindowToolbar
      actions={
        <ButtonGroup small>
          <IconButton
            small
            icon='folder'
            title={t('logViewer.buttons.openLogFile')}
            aria-label={t('logViewer.buttons.openLogFile')}
            onClick={onOpenLogFile}
          />
          {!isDefaultLog && (
            <IconButton
              small
              icon='home'
              title={t('logViewer.buttons.defaultLog')}
              aria-label={t('logViewer.buttons.defaultLog')}
              onClick={onOpenDefaultLog}
            />
          )}
          <IconButton
            small
            icon='refresh'
            disabled={isLoading}
            title={t('logViewer.buttons.refresh')}
            aria-label={t('logViewer.buttons.refresh')}
            onClick={onRefresh}
          />
          <IconButton
            small
            icon={isStreaming ? 'pause' : 'play'}
            primary={isStreaming}
            disabled={!isDefaultLog}
            title={
              isStreaming
                ? t('logViewer.buttons.stopAutoRefresh')
                : t('logViewer.buttons.autoRefresh')
            }
            aria-label={
              isStreaming
                ? t('logViewer.buttons.stopAutoRefresh')
                : t('logViewer.buttons.autoRefresh')
            }
            onClick={onToggleStreaming}
          />
          <IconButton
            small
            icon={hasCopied ? 'check' : 'copy'}
            title={
              hasCopied
                ? t('logViewer.buttons.copied')
                : t('logViewer.buttons.copy')
            }
            aria-label={
              hasCopied
                ? t('logViewer.buttons.copied')
                : t('logViewer.buttons.copy')
            }
            onClick={() => {
              onCopy();
              acknowledgeCopy();
            }}
          />
          <IconButton
            small
            icon='download'
            title={t('logViewer.buttons.save')}
            aria-label={t('logViewer.buttons.save')}
            onClick={onSave}
          />
        </ButtonGroup>
      }
    >
      <Icon
        name={isDefaultLog ? 'file-generic' : 'attachment'}
        size='x16'
        color='hint'
      />
      <Box
        marginInlineStart='x4'
        fontScale='p2b'
        color='default'
        title={filePath ?? fileName}
        withTruncatedText
      >
        {fileName}
      </Box>
      {!isDefaultLog && (
        <Box marginInlineStart='x8' className={NO_DRAG_REGION_CLASS}>
          <Tag variant='secondary-info'>{t('logViewer.fileInfo.custom')}</Tag>
        </Box>
      )}
    </WindowToolbar>
  );
};
