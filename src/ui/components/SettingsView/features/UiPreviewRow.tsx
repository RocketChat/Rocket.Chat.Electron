import { Box, Button } from '@rocket.chat/fuselage';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { invoke } from '../../../../ipc/renderer';
import type { Server } from '../../../../servers/common';

type UiPreviewRowProps = {
  server: Server;
};

// What a workspace runs now; builds are added and applied from the list above.
export const UiPreviewRow = ({ server }: UiPreviewRowProps) => {
  const activeLabel = server.uiPreview;
  const { t } = useTranslation();
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string>();

  const handleRestore = async () => {
    setIsRestoring(true);
    setError(undefined);
    try {
      await invoke('ui-preview/restore', server.url);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsRestoring(false);
    }
  };

  const status = (() => {
    if (error) {
      return {
        color: 'danger',
        text: t('settings.options.uiPreview.failed', { message: error }),
      };
    }
    if (activeLabel) {
      return {
        color: 'status-font-on-success',
        text: t('settings.options.uiPreview.active', { label: activeLabel }),
      };
    }
    return { color: 'hint', text: t('settings.options.uiPreview.inactive') };
  })();

  return (
    <Box
      display='flex'
      alignItems='center'
      justifyContent='space-between'
      mbe={12}
      aria-label={server.title ?? server.url}
      role='group'
    >
      <Box display='flex' flexDirection='column' flexGrow={1} minWidth={0}>
        <Box fontScale='p2m' color='default' withTruncatedText>
          {server.title ?? server.url}
        </Box>
        <Box fontScale='c1' color='hint' withTruncatedText>
          {server.url}
        </Box>
        <Box fontScale='c1' color={status.color} role='status'>
          {status.text}
        </Box>
      </Box>
      <Button
        small
        mis={8}
        flexShrink={0}
        loading={isRestoring}
        disabled={isRestoring || !activeLabel}
        onClick={handleRestore}
      >
        {t('settings.options.uiPreview.restore')}
      </Button>
    </Box>
  );
};
