import { Box, Icon, ProgressBar } from '@rocket.chat/fuselage';
import { useMemo } from 'react';
import type { useTranslation } from 'react-i18next';

import type { Download } from '../../../downloads/common';
import { invoke } from '../../../ipc/renderer';

type DownloadsIndicatorItemProps = {
  download: Download;
  t: ReturnType<typeof useTranslation>['t'];
  i18n: ReturnType<typeof useTranslation>['i18n'];
};

export const DownloadsIndicatorItem = ({
  download,
  t,
  i18n,
}: DownloadsIndicatorItemProps) => {
  const { itemId, state, fileName, receivedBytes, totalBytes } = download;

  const isTerminalError =
    state === 'cancelled' || state === 'interrupted' || state === 'expired';

  const percentage = useMemo(
    () =>
      totalBytes > 0
        ? Math.min(
            100,
            Math.max(0, Math.floor((receivedBytes / totalBytes) * 100))
          )
        : 0,
    [receivedBytes, totalBytes]
  );

  const statusLabel = useMemo(() => {
    if (state === 'cancelled') {
      return t('tabBar.downloads.canceled');
    }

    if (state === 'interrupted' || state === 'expired') {
      return t('tabBar.downloads.failed');
    }

    return undefined;
  }, [state, t]);

  const sizeLabel = useMemo(() => {
    if (isTerminalError) {
      return undefined;
    }

    if (state === 'completed') {
      return i18n.format(totalBytes, 'byteSize');
    }

    if (!totalBytes) {
      return undefined;
    }

    return t('downloads.item.progressSize', {
      receivedBytes,
      totalBytes,
      ratio: totalBytes > 0 ? receivedBytes / totalBytes : 0,
    });
  }, [i18n, isTerminalError, receivedBytes, state, t, totalBytes]);

  const handlePause = (): void => {
    invoke('downloads/pause', itemId);
  };

  const handleResume = (): void => {
    invoke('downloads/resume', itemId);
  };

  const handleCancel = (): void => {
    invoke('downloads/cancel', itemId);
  };

  const handleShowInFolder = (): void => {
    if (state === 'completed') {
      invoke('downloads/show-in-folder', itemId);
    }
  };

  return (
    <Box
      is={state === 'completed' ? 'button' : 'div'}
      type={state === 'completed' ? 'button' : undefined}
      title={
        state === 'completed' ? t('tabBar.downloads.showInFolder') : undefined
      }
      aria-label={
        state === 'completed' ? t('tabBar.downloads.showInFolder') : undefined
      }
      display='flex'
      flexDirection='column'
      width='100%'
      paddingBlock='x8'
      style={
        state === 'completed'
          ? {
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              textAlign: 'left',
            }
          : undefined
      }
      onClick={state === 'completed' ? handleShowInFolder : undefined}
    >
      <Box display='flex' alignItems='center' justifyContent='space-between'>
        <Box
          fontScale='p2'
          color='default'
          withTruncatedText
          flexGrow={1}
          mie='x8'
        >
          {fileName}
        </Box>
        {state === 'progressing' && (
          <Box
            is='button'
            type='button'
            fontScale='c1'
            color='info'
            style={{ cursor: 'pointer', background: 'none', border: 'none' }}
            onClick={(event: any) => {
              event.stopPropagation();
              handlePause();
            }}
          >
            {t('tabBar.downloads.pause')}
          </Box>
        )}
        {state === 'paused' && (
          <Box
            is='button'
            type='button'
            fontScale='c1'
            color='info'
            style={{ cursor: 'pointer', background: 'none', border: 'none' }}
            onClick={(event: any) => {
              event.stopPropagation();
              handleResume();
            }}
          >
            {t('tabBar.downloads.resume')}
          </Box>
        )}
        {(state === 'progressing' || state === 'paused') && (
          <Box
            is='button'
            type='button'
            fontScale='c1'
            color='danger'
            mis='x8'
            style={{ cursor: 'pointer', background: 'none', border: 'none' }}
            onClick={(event: any) => {
              event.stopPropagation();
              handleCancel();
            }}
          >
            {t('tabBar.downloads.cancel')}
          </Box>
        )}
      </Box>
      {(state === 'progressing' || state === 'paused') && (
        <Box position='relative' marginBlockStart='x4'>
          <ProgressBar
            percentage={percentage}
            animated={state === 'progressing' && percentage !== 100}
            height='x4'
          />
        </Box>
      )}
      {statusLabel && (
        <Box
          display='flex'
          alignItems='center'
          color='hint'
          fontScale='c1'
          marginBlockStart='x4'
        >
          <Icon name='ban' size='x12' mie='x4' />
          {statusLabel}
        </Box>
      )}
      {sizeLabel && (
        <Box color='hint' fontScale='c1' marginBlockStart='x4'>
          {sizeLabel}
        </Box>
      )}
    </Box>
  );
};

export default DownloadsIndicatorItem;
