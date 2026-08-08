import { Box, ButtonGroup, Icon, IconButton, Tag } from '@rocket.chat/fuselage';
import { useTranslation } from 'react-i18next';

import type { Surfaces } from './appearance';
import { isDarwin } from './appearance';
import { TOOLBAR_HEIGHT, TRAFFIC_LIGHTS_INSET } from './constants';
import { DRAG_REGION_CLASS, NO_DRAG_REGION_CLASS } from './styles';

export type LogViewerToolbarProps = {
  surfaces: Surfaces;
  fileName: string;
  filePath?: string;
  isDefaultLog: boolean;
  isSidebarVisible: boolean;
  onToggleSidebar: () => void;
  isLoading: boolean;
  isStreaming: boolean;
  onOpenLogFile: () => void;
  onOpenDefaultLog: () => void;
  onRefresh: () => void;
  onToggleStreaming: () => void;
  onCopy: () => void;
  onSave: () => void;
  onClear: () => void;
};

export const LogViewerToolbar = ({
  surfaces,
  fileName,
  filePath,
  isDefaultLog,
  isSidebarVisible,
  onToggleSidebar,
  isLoading,
  isStreaming,
  onOpenLogFile,
  onOpenDefaultLog,
  onRefresh,
  onToggleStreaming,
  onCopy,
  onSave,
  onClear,
}: LogViewerToolbarProps) => {
  const { t } = useTranslation();

  return (
    <Box
      display='flex'
      flexDirection='row'
      alignItems='center'
      flexShrink={0}
      // The toolbar is the title bar on macOS, so it has to be draggable and
      // reserve room for the traffic lights that float over it. Both paddings go
      // through Box props: Box emits styling props as `!important`, so an inline
      // `paddingInlineStart` would lose to `paddingInline`.
      paddingInlineStart={isDarwin ? TRAFFIC_LIGHTS_INSET : 12}
      paddingInlineEnd='x12'
      className={isDarwin ? DRAG_REGION_CLASS : undefined}
      style={{
        height: `${TOOLBAR_HEIGHT}px`,
        backgroundColor: surfaces.chrome,
        borderBlockEnd: `1px solid ${surfaces.divider}`,
        userSelect: 'none',
      }}
    >
      <Box
        display='flex'
        alignItems='center'
        flexShrink={0}
        className={NO_DRAG_REGION_CLASS}
      >
        <IconButton
          small
          icon='burger-menu'
          pressed={isSidebarVisible}
          title={t('logViewer.buttons.toggleFilters')}
          aria-label={t('logViewer.buttons.toggleFilters')}
          onClick={onToggleSidebar}
        />
      </Box>

      <Box
        display='flex'
        alignItems='center'
        flexGrow={1}
        justifyContent='center'
        marginInline='x12'
        style={{ minWidth: 0 }}
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
      </Box>

      <Box flexShrink={0} className={NO_DRAG_REGION_CLASS}>
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
            icon='copy'
            title={t('logViewer.buttons.copy')}
            aria-label={t('logViewer.buttons.copy')}
            onClick={onCopy}
          />
          <IconButton
            small
            icon='download'
            title={t('logViewer.buttons.save')}
            aria-label={t('logViewer.buttons.save')}
            onClick={onSave}
          />
          <IconButton
            small
            danger
            icon='trash'
            disabled={!isDefaultLog}
            title={t('logViewer.buttons.clear')}
            aria-label={t('logViewer.buttons.clear')}
            onClick={onClear}
          />
        </ButtonGroup>
      </Box>
    </Box>
  );
};
