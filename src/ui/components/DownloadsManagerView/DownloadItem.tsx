import { Box, ProgressBar } from '@rocket.chat/fuselage';
import React, { ComponentProps, FC, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Download } from '../../../downloads/common';
import { invoke } from '../../../ipc/renderer';
import ActionButton from './ActionButton';
import FileIcon from './FileIcon';

type DownloadItemProps = Download & ComponentProps<typeof Box>;

const DownloadItem: FC<DownloadItemProps> = ({
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
}) => {
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
      width='100%'
      height={44}
      mbe={26}
      display='flex'
      alignItems='center'
      {...props}
    >
      <Box
        width={388}
        flexShrink={0}
        display='flex'
        flexDirection='row'
        alignItems='left'
        justifyContent='center'
      >
        <FileIcon fileName={fileName} mimeType={mimeType} />
        <Box width={344} mis={8}>
          <Box
            mbe={4}
            color={errored || expired ? 'danger-500' : 'default'}
            fontScale='p1'
            withTruncatedText
          >
            {fileName}
          </Box>
          <Box color='neutral-600' fontScale='c1' withTruncatedText>
            {serverTitle}
          </Box>
        </Box>
      </Box>

      <Box display='flex' flexDirection='column' flexGrow={1} mi={16}>
        <Box
          display='flex'
          flexDirection='row'
          mbe={6}
          alignItems='center'
          justifyContent='space-between'
        >
          <Box display='flex' flexDirection='row' alignItems='center'>
            {progressSize ? (
              <Box
                mie={12}
                color='neutral-600'
                fontScale='c1'
                withTruncatedText
              >
                {progressSize}
              </Box>
            ) : null}
            {progressSpeed ? (
              <Box
                mie={12}
                color='neutral-600'
                fontScale='c1'
                withTruncatedText
              >
                {progressSpeed}
              </Box>
            ) : null}
            {estimatedTimeLeft ? (
              <Box color='neutral-600' fontScale='c1' withTruncatedText>
                {estimatedTimeLeft}
              </Box>
            ) : null}
          </Box>
          <Box display='flex' fontScale='c1'>
            {expired && (
              <ActionButton onClick={handleRemove}>
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
                <ActionButton onClick={handleCancel}>
                  {t('downloads.item.cancel')}
                </ActionButton>
              </>
            )}
            {state === 'paused' && (
              <>
                <ActionButton onClick={handleResume}>
                  {t('downloads.item.resume')}
                </ActionButton>
                <ActionButton onClick={handleCancel}>
                  {t('downloads.item.cancel')}
                </ActionButton>
              </>
            )}
            {state === 'completed' && (
              <>
                <ActionButton onClick={handleShowInFolder}>
                  {t('downloads.item.showInFolder')}
                </ActionButton>
                <ActionButton onClick={handleRemove}>
                  {t('downloads.item.remove')}
                </ActionButton>
              </>
            )}
            {errored && (
              <>
                <ActionButton onClick={handleRetry}>
                  {t('downloads.item.retry')}
                </ActionButton>
                <ActionButton onClick={handleRemove}>
                  {t('downloads.item.remove')}
                </ActionButton>
              </>
            )}
          </Box>
        </Box>
        <Box mbe={8} position='relative'>
          <ProgressBar
            percentage={percentage}
            error={errored ? t('downloads.item.errored') : undefined}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default DownloadItem;
