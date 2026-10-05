import { Box, Button, IconButton } from '@rocket.chat/fuselage';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import type { Dispatch } from 'redux';

import { invoke } from '../../../../ipc/renderer';
import type { Server } from '../../../../servers/common';
import type { RootAction } from '../../../../store/actions';
import { UI_PREVIEW_HISTORY_ENTRY_REMOVED } from '../../../actions';
import type { UiPreviewHistoryEntry } from '../../../common';
import type {
  UiPreviewHistoryResult,
  UiPreviewResult,
} from '../../../main/serverView/uiPreview';

export type Status = { color: string; text: string } | null;

export const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

type UiPreviewHistoryItemProps = {
  entry: UiPreviewHistoryEntry;
  servers: Server[];
  targetUrl: Server['url'];
};

export const UiPreviewHistoryItem = ({
  entry,
  servers,
  targetUrl,
}: UiPreviewHistoryItemProps) => {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const [busy, setBusy] = useState<'apply' | 'refresh' | null>(null);
  const [status, setStatus] = useState<Status>(null);

  const failed = (message: string) => ({
    color: 'danger',
    text: t('settings.options.uiPreview.failed', { message }),
  });

  const handleApply = async () => {
    setBusy('apply');
    setStatus({ color: 'hint', text: t('settings.options.uiPreview.loading') });
    try {
      const result: UiPreviewResult = await invoke(
        'ui-preview/apply',
        targetUrl,
        entry.input
      );
      if (result.status === 'failed') {
        setStatus(failed(result.message));
      } else if (result.status === 'cancelled') {
        setStatus({
          color: 'hint',
          text: t('settings.options.uiPreview.cancelled'),
        });
      } else {
        setStatus(null);
      }
    } catch (error) {
      setStatus(failed(messageOf(error)));
    } finally {
      setBusy(null);
    }
  };

  const handleRefresh = async () => {
    setBusy('refresh');
    setStatus({
      color: 'hint',
      text: t('settings.options.uiPreview.refreshing'),
    });
    try {
      const result: UiPreviewHistoryResult = await invoke(
        'ui-preview/refresh',
        entry.input
      );
      if (result.status === 'failed') {
        setStatus(failed(result.message));
      } else {
        setStatus({
          color: 'hint',
          text: t(
            result.status === 'current'
              ? 'settings.options.uiPreview.current'
              : 'settings.options.uiPreview.updated'
          ),
        });
      }
    } catch (error) {
      setStatus(failed(messageOf(error)));
    } finally {
      setBusy(null);
    }
  };

  const handleRemove = () => {
    dispatch({ type: UI_PREVIEW_HISTORY_ENTRY_REMOVED, payload: entry.input });
  };

  const details = [
    entry.revision?.slice(0, 7),
    entry.createdAt &&
      t('settings.options.uiPreview.builtAt', {
        date: new Date(entry.createdAt).toLocaleString(i18n.language, {
          dateStyle: 'medium',
          timeStyle: 'short',
        }),
      }),
  ]
    .filter(Boolean)
    .join(' · ');

  const activeOn = servers
    .filter(({ uiPreviewSource }) => uiPreviewSource === entry.input)
    .map(({ title, url }) => title ?? url)
    .join(', ');

  return (
    <Box
      display='flex'
      alignItems='center'
      justifyContent='space-between'
      mbe={12}
      aria-label={entry.label}
      role='group'
    >
      <Box display='flex' flexDirection='column' flexGrow={1} minWidth={0}>
        <Box fontScale='p2m' color='default' withTruncatedText>
          {entry.label}
        </Box>
        {details && (
          <Box fontScale='c1' color='hint'>
            {details}
          </Box>
        )}
        {activeOn && (
          <Box fontScale='c1' color='status-font-on-success'>
            {t('settings.options.uiPreview.activeOn', { workspaces: activeOn })}
          </Box>
        )}
        {status && (
          <Box fontScale='c1' color={status.color} role='status'>
            {status.text}
          </Box>
        )}
      </Box>
      <Box display='flex' alignItems='center' flexShrink={0} mis={8}>
        <Button
          small
          loading={busy === 'apply'}
          disabled={busy !== null}
          onClick={handleApply}
        >
          {t('settings.options.uiPreview.apply')}
        </Button>
        <IconButton
          small
          mis={4}
          icon='refresh'
          title={t('settings.options.uiPreview.refresh')}
          aria-label={t('settings.options.uiPreview.refresh')}
          disabled={busy !== null}
          onClick={handleRefresh}
        />
        <IconButton
          small
          mis={4}
          icon='trash'
          title={t('settings.options.uiPreview.remove')}
          aria-label={t('settings.options.uiPreview.remove')}
          disabled={busy !== null}
          onClick={handleRemove}
        />
      </Box>
    </Box>
  );
};
