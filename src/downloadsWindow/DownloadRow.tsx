import { Box, IconButton, ProgressBar, Tag } from '@rocket.chat/fuselage';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { Download } from '../downloads/common';
import { invoke } from '../ipc/renderer';
import { formatServerTitle } from '../ui/components/utils/formatServerTitle';
import type { Surfaces } from '../ui/windowChrome/appearance';
import { isDarwin } from '../ui/windowChrome/appearance';
import { LIST_ROW_CLASS } from '../ui/windowChrome/styles';
import { FileTypeIcon } from './FileTypeIcon';
import { DOWNLOAD_NAME_CLASS } from './styles';

export type DownloadRowProps = {
  download: Download;
  surfaces: Surfaces;
};

/**
 * One download as a list row rather than a card: icon, name and a single muted
 * line of metadata, with the actions that apply to its current state. The
 * progress bar only appears while a transfer is live.
 */
export const DownloadRow = ({ download, surfaces }: DownloadRowProps) => {
  const { t, i18n } = useTranslation();
  const {
    itemId,
    state,
    fileName,
    receivedBytes,
    totalBytes,
    startTime,
    endTime,
    mimeType,
    serverTitle,
  } = download;

  const errored = state === 'interrupted' || state === 'cancelled';
  const expired = state === 'expired';
  const isActive = state === 'progressing' || state === 'paused';

  const percentage = useMemo(
    () => (totalBytes ? Math.floor((receivedBytes / totalBytes) * 100) : 0),
    [receivedBytes, totalBytes]
  );

  /** Server, size and — while a transfer is live — its rate and time left. */
  const meta = useMemo(() => {
    const parts: string[] = [];

    if (serverTitle) parts.push(formatServerTitle(serverTitle));

    if (receivedBytes && totalBytes) {
      // The "x of y" form only says something while bytes are still moving.
      parts.push(
        isActive
          ? t('downloads.item.progressSize', {
              receivedBytes,
              totalBytes,
              ratio: receivedBytes / totalBytes,
            })
          : String(i18n.format(totalBytes, 'byteSize'))
      );
    }

    if (state === 'progressing' && receivedBytes && startTime && endTime) {
      const elapsed = endTime - startTime;
      if (elapsed > 0) {
        parts.push(
          String(i18n.format((receivedBytes / elapsed) * 1000, 'byteSpeed'))
        );
        if (totalBytes) {
          parts.push(
            String(
              i18n.format(
                (totalBytes - receivedBytes) / (receivedBytes / elapsed),
                'duration'
              )
            )
          );
        }
      }
    }

    return parts.join(' · ');
  }, [
    endTime,
    i18n,
    isActive,
    receivedBytes,
    serverTitle,
    startTime,
    state,
    t,
    totalBytes,
  ]);

  const run = useCallback(
    (channel: Parameters<typeof invoke>[0]) => () => {
      invoke(channel as any, itemId as never);
    },
    [itemId]
  );

  return (
    <Box
      className={LIST_ROW_CLASS}
      display='flex'
      flexDirection='row'
      alignItems='center'
      paddingInline='x12'
      paddingBlock='x8'
      style={{ borderBlockEnd: `1px solid ${surfaces.divider}` }}
    >
      <FileTypeIcon fileName={fileName} mimeType={mimeType} />

      <Box flexGrow={1} marginInline='x12' style={{ minWidth: 0 }}>
        <Box
          display='flex'
          alignItems='center'
          color={errored || expired ? 'danger' : 'default'}
          fontScale='p2'
        >
          {state === 'completed' ? (
            <Box
              is='button'
              type='button'
              className={DOWNLOAD_NAME_CLASS}
              withTruncatedText
              title={t('downloads.item.openFile', { fileName })}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                font: 'inherit',
                color: 'inherit',
                textAlign: 'start',
                cursor: 'pointer',
                minWidth: 0,
              }}
              onClick={run('downloads/open-file')}
            >
              {fileName}
            </Box>
          ) : (
            <Box withTruncatedText title={fileName}>
              {fileName}
            </Box>
          )}
          {errored && (
            <Box marginInlineStart='x8' flexShrink={0}>
              <Tag variant='secondary-danger'>
                {t('downloads.item.errored')}
              </Tag>
            </Box>
          )}
        </Box>
        {meta && (
          <Box
            color='hint'
            fontScale='c1'
            withTruncatedText
            marginBlockStart='x2'
          >
            {meta}
          </Box>
        )}
        {isActive && (
          <Box marginBlockStart='x4'>
            <ProgressBar
              percentage={percentage}
              animated={state === 'progressing'}
            />
          </Box>
        )}
      </Box>

      <Box
        flexShrink={0}
        display='flex'
        alignItems='center'
        marginInlineStart='x8'
        style={{ gap: '2px' }}
      >
        {state === 'progressing' && (
          <IconButton
            small
            color='secondary-info'
            icon='pause'
            title={t('downloads.item.pause')}
            aria-label={t('downloads.item.pause')}
            onClick={run('downloads/pause')}
          />
        )}
        {state === 'paused' && (
          <IconButton
            small
            color='secondary-info'
            icon='play'
            title={t('downloads.item.resume')}
            aria-label={t('downloads.item.resume')}
            onClick={run('downloads/resume')}
          />
        )}
        {isActive && (
          <IconButton
            small
            color='secondary-info'
            icon='cross'
            title={t('downloads.item.cancel')}
            aria-label={t('downloads.item.cancel')}
            onClick={run('downloads/cancel')}
          />
        )}
        {/* Quick Look has no equivalent off macOS, so it is offered there only. */}
        {isDarwin && state === 'completed' && (
          <IconButton
            small
            color='secondary-info'
            icon='eye'
            title={t('downloads.item.preview')}
            aria-label={t('downloads.item.preview')}
            onClick={run('downloads/preview-file')}
          />
        )}
        {state === 'completed' && (
          <IconButton
            small
            color='secondary-info'
            icon='folder'
            title={t('downloads.item.showInFolder')}
            aria-label={t('downloads.item.showInFolder')}
            onClick={run('downloads/show-in-folder')}
          />
        )}
        {errored && (
          <IconButton
            small
            color='secondary-info'
            icon='refresh'
            title={t('downloads.item.retry')}
            aria-label={t('downloads.item.retry')}
            onClick={run('downloads/retry')}
          />
        )}
        {!expired && (
          <IconButton
            small
            color='secondary-info'
            icon='link'
            title={t('downloads.item.copyLink')}
            aria-label={t('downloads.item.copyLink')}
            onClick={run('downloads/copy-link')}
          />
        )}
        {/*
          A cross, not a trash can: this drops the entry from the list and
          leaves the downloaded file alone. It is also only offered once the
          transfer is over — while it is live, Cancel is the equivalent action,
          and two crosses side by side would be ambiguous.
        */}
        {!isActive && (
          <IconButton
            small
            color='secondary-info'
            icon='cross'
            title={t('downloads.item.remove')}
            aria-label={t('downloads.item.remove')}
            onClick={run('downloads/remove')}
          />
        )}
      </Box>
    </Box>
  );
};
