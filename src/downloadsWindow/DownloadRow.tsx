import { Box, IconButton, Tag } from '@rocket.chat/fuselage';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { Download } from '../downloads/common';
import { invoke } from '../ipc/renderer';
import { formatServerTitle } from '../ui/components/utils/formatServerTitle';
import { isDarwin } from '../ui/windowChrome/appearance';
import { LIST_ROW_CLASS } from '../ui/windowChrome/styles';
import { useCopiedFeedback } from '../ui/windowChrome/useCopiedFeedback';
import { FileTypeIcon } from './FileTypeIcon';
import { DOWNLOAD_NAME_CLASS } from './styles';

export type DownloadRowProps = {
  download: Download;
  /**
   * The workspace a download came from. Worth saying in the downloads window,
   * which filters by it; noise in the main window's panel, which lists a
   * handful of downloads from the session at hand.
   */
  showServer?: boolean;
};

/**
 * One download as a list row rather than a card: icon, name and a single muted
 * line of metadata, with the actions that apply to its current state. The
 * progress bar only appears while a transfer is live.
 *
 * Shared by the downloads window and the main window's downloads panel, so a
 * download reads the same wherever it is seen.
 */
export const DownloadRow = ({
  download,
  showServer = true,
}: DownloadRowProps) => {
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

    if (showServer && serverTitle) parts.push(formatServerTitle(serverTitle));

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
    showServer,
    startTime,
    state,
    t,
    totalBytes,
  ]);

  const [hasCopiedLink, acknowledgeCopy] = useCopiedFeedback();

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
      position='relative'
      paddingInline='x12'
      paddingBlock='x8'
      // Straight from the palette rather than the window's surfaces, so the row
      // can be dropped into the main window's downloads panel unchanged.
      style={{
        borderBlockEnd: '1px solid var(--rcx-color-stroke-extra-light)',
      }}
    >
      {/*
        Progress rides along the row's bottom edge instead of sitting under the
        text: in the flow it added 12px the moment a transfer started, so every
        row below it jumped. Drawn here rather than with Fuselage's ProgressBar,
        whose animated shine is an absolutely positioned pseudo-element with no
        containing block of its own — it escapes the bar and sweeps the whole
        list.
      */}
      {isActive && (
        <Box
          style={{
            position: 'absolute',
            insetInline: 0,
            insetBlockEnd: 0,
            height: '2px',
            backgroundColor: 'var(--rcx-color-stroke-extra-light)',
          }}
        >
          <Box
            style={{
              width: `${percentage}%`,
              height: '100%',
              backgroundColor: 'var(--rcx-color-font-info)',
              transition: window.matchMedia('(prefers-reduced-motion: reduce)')
                .matches
                ? 'none'
                : 'width 150ms ease-out',
            }}
          />
        </Box>
      )}
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
            icon='pause'
            title={t('downloads.item.pause')}
            aria-label={t('downloads.item.pause')}
            onClick={run('downloads/pause')}
          />
        )}
        {state === 'paused' && (
          <IconButton
            small
            icon='play'
            title={t('downloads.item.resume')}
            aria-label={t('downloads.item.resume')}
            onClick={run('downloads/resume')}
          />
        )}
        {/* Quick Look has no equivalent off macOS, so it is offered there only. */}
        {isDarwin && state === 'completed' && (
          <IconButton
            small
            icon='eye'
            title={t('downloads.item.preview')}
            aria-label={t('downloads.item.preview')}
            onClick={run('downloads/preview-file')}
          />
        )}
        {state === 'completed' && (
          <IconButton
            small
            icon='folder'
            title={t('downloads.item.showInFolder')}
            aria-label={t('downloads.item.showInFolder')}
            onClick={run('downloads/show-in-folder')}
          />
        )}
        {errored && (
          <IconButton
            small
            icon='refresh'
            title={t('downloads.item.retry')}
            aria-label={t('downloads.item.retry')}
            onClick={run('downloads/retry')}
          />
        )}
        {!expired && (
          <IconButton
            small
            icon={hasCopiedLink ? 'check' : 'link'}
            title={
              hasCopiedLink
                ? t('downloads.item.copied')
                : t('downloads.item.copyLink')
            }
            aria-label={
              hasCopiedLink
                ? t('downloads.item.copied')
                : t('downloads.item.copyLink')
            }
            onClick={() => {
              run('downloads/copy-link')();
              acknowledgeCopy();
            }}
          />
        )}
        {/*
          Whatever a row's state, its last action is a cross, so the button
          nearest the edge never moves as a download progresses.

          They are not the same action: while a transfer is live the cross
          cancels it; once it is over the cross drops the entry from the list
          and leaves the downloaded file alone.
        */}
        {isActive && (
          <IconButton
            small
            icon='cross'
            title={t('downloads.item.cancel')}
            aria-label={t('downloads.item.cancel')}
            onClick={run('downloads/cancel')}
          />
        )}
        {!isActive && (
          <IconButton
            small
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
