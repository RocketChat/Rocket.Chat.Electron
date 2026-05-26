import { css } from '@rocket.chat/css-in-js';
import { Box, ButtonGroup, ProgressBar } from '@rocket.chat/fuselage';
import type { ComponentProps } from 'react';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { Download } from '../../../downloads/common';
import { invoke } from '../../../ipc/renderer';
import ActionButton from './ActionButton';
import FileIcon from './FileIcon';

type DownloadItemProps = Download & ComponentProps<typeof Box>;

const rowStyles = css`
  border-block-start: 1px solid
    var(--rcx-color-stroke-extra-light, transparent);
  transition: background-color 120ms ease-out;
  &:first-of-type {
    border-block-start: none;
  }
  &:hover {
    background-color: var(--rcx-color-surface-hover, transparent);
  }
`;

const DownloadItem = ({
  itemId,
  state,
  status: _status,
  fileName,
  receivedBytes,
  totalBytes,
  startTime,
  endTime,
  url: _url,
  mimeType,
  serverTitle,
  serverUrl: _serverUrl,
  savePath: _savePath,
  ...props
}: DownloadItemProps) => {
  const { t, i18n } = useTranslation();

  const progressSize = useMemo(() => {
    if (!receivedBytes || !totalBytes) {
      return undefined;
    }

    if (state === 'completed') {
      return i18n.format(totalBytes, 'byteSize');
    }

    return t('downloads.item.progressSize', {
      receivedBytes,
      totalBytes,
      ratio: receivedBytes / totalBytes,
    });
  }, [i18n, receivedBytes, state, t, totalBytes]);

  const progressSpeed = useMemo(() => {
    if (
      !receivedBytes ||
      !totalBytes ||
      !startTime ||
      !endTime ||
      state !== 'progressing'
    ) {
      return undefined;
    }

    return i18n.format(
      (receivedBytes / (endTime - startTime)) * 1000,
      'byteSpeed'
    );
  }, [endTime, i18n, receivedBytes, startTime, state, totalBytes]);

  const estimatedTimeLeft = useMemo(() => {
    if (
      !receivedBytes ||
      !totalBytes ||
      !startTime ||
      !endTime ||
      state !== 'progressing'
    ) {
      return undefined;
    }

    const remainingBytes = totalBytes - receivedBytes;
    const speed = receivedBytes / (endTime - startTime);
    return i18n.format(remainingBytes / speed, 'duration');
  }, [endTime, i18n, receivedBytes, startTime, state, totalBytes]);

  const handlePause = useCallback(() => {
    invoke('downloads/pause', itemId);
  }, [itemId]);

  const handleResume = useCallback(() => {
    invoke('downloads/resume', itemId);
  }, [itemId]);

  const handleCancel = useCallback(async () => {
    invoke('downloads/cancel', itemId);
  }, [itemId]);

  const handleShowInFolder = useCallback((): void => {
    invoke('downloads/show-in-folder', itemId);
  }, [itemId]);

  const handleRetry = useCallback(() => {
    invoke('downloads/retry', itemId);
  }, [itemId]);

  const handleRemove = useCallback(() => {
    invoke('downloads/remove', itemId);
  }, [itemId]);

  const handleCopyLink = useCallback(() => {
    invoke('downloads/copy-link', itemId);
  }, [itemId]);

  const errored = state === 'interrupted' || state === 'cancelled';
  const expired = state === 'expired';
  const percentage = useMemo(
    () => Math.floor((receivedBytes / totalBytes) * 100),
    [receivedBytes, totalBytes]
  );

  return (
    <Box
      className={rowStyles}
      width='100%'
      pbs={16}
      pbe={16}
      pi={8}
      display='flex'
      alignItems='center'
      {...props}
    >
      <Box
        flexShrink={0}
        display='flex'
        flexDirection='row'
        alignItems='center'
        minWidth='x320'
        maxWidth='x388'
        flexGrow={0}
        flexBasis='x388'
      >
        <FileIcon fileName={fileName} mimeType={mimeType} />
        <Box mis={8} minWidth={0} flexGrow={1}>
          <Box
            mbe={4}
            color={errored || expired ? 'font-danger' : 'font-default'}
            fontScale='p1'
            withTruncatedText
          >
            {fileName}
          </Box>
          <Box color='font-secondary-info' fontScale='c1' withTruncatedText>
            {serverTitle}
          </Box>
        </Box>
      </Box>

      <Box
        display='flex'
        flexDirection='column'
        flexGrow={1}
        flexShrink={1}
        minWidth={0}
        mi={16}
      >
        <Box
          display='flex'
          flexDirection='row'
          mbe={8}
          alignItems='center'
          justifyContent='space-between'
        >
          <Box
            display='flex'
            flexDirection='row'
            alignItems='center'
            minWidth={0}
            flexShrink={1}
          >
            {progressSize ? (
              <Box
                mie={12}
                color='font-secondary-info'
                fontScale='c1'
                withTruncatedText
              >
                {progressSize}
              </Box>
            ) : null}
            {progressSpeed ? (
              <Box
                mie={12}
                color='font-secondary-info'
                fontScale='c1'
                withTruncatedText
              >
                {progressSpeed}
              </Box>
            ) : null}
            {estimatedTimeLeft ? (
              <Box
                color='font-secondary-info'
                fontScale='c1'
                withTruncatedText
              >
                {estimatedTimeLeft}
              </Box>
            ) : null}
          </Box>
          <ButtonGroup small>
            {expired && (
              <ActionButton danger onClick={handleRemove}>
                {t('downloads.item.remove')}
              </ActionButton>
            )}
            {!expired && (
              <ActionButton onClick={handleCopyLink}>
                {t('downloads.item.copyLink')}
              </ActionButton>
            )}
            {state === 'progressing' && (
              <>
                <ActionButton onClick={handlePause}>
                  {t('downloads.item.pause')}
                </ActionButton>
                <ActionButton danger onClick={handleCancel}>
                  {t('downloads.item.cancel')}
                </ActionButton>
              </>
            )}
            {state === 'paused' && (
              <>
                <ActionButton onClick={handleResume}>
                  {t('downloads.item.resume')}
                </ActionButton>
                <ActionButton danger onClick={handleCancel}>
                  {t('downloads.item.cancel')}
                </ActionButton>
              </>
            )}
            {state === 'completed' && (
              <>
                <ActionButton onClick={handleShowInFolder}>
                  {t('downloads.item.showInFolder')}
                </ActionButton>
                <ActionButton danger onClick={handleRemove}>
                  {t('downloads.item.remove')}
                </ActionButton>
              </>
            )}
            {errored && (
              <>
                <ActionButton onClick={handleRetry}>
                  {t('downloads.item.retry')}
                </ActionButton>
                <ActionButton danger onClick={handleRemove}>
                  {t('downloads.item.remove')}
                </ActionButton>
              </>
            )}
          </ButtonGroup>
        </Box>
        {state !== 'completed' && (
          <Box position='relative'>
            <ProgressBar
              percentage={percentage}
              error={errored ? t('downloads.item.errored') : undefined}
              animated={percentage !== 100}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default DownloadItem;
