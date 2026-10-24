import {
  Box,
  Button,
  Field,
  FieldLabel,
  Select,
  TextInput,
} from '@rocket.chat/fuselage';
import type { ChangeEvent, Key, KeyboardEvent } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import { invoke } from '../../../../ipc/renderer';
import type { Server } from '../../../../servers/common';
import type { RootState } from '../../../../store/rootReducer';
import type { UiPreviewHistoryResult } from '../../../main/serverView/uiPreview';
import type { Status } from './UiPreviewHistoryItem';
import { messageOf, UiPreviewHistoryItem } from './UiPreviewHistoryItem';

type UiPreviewHistoryProps = {
  servers: Server[];
};

export const UiPreviewHistory = ({ servers }: UiPreviewHistoryProps) => {
  const { t } = useTranslation();
  const history = useSelector(
    ({ uiPreviewHistory }: RootState) => uiPreviewHistory
  );
  const currentUrl = useSelector(({ currentView }: RootState) =>
    typeof currentView === 'object' && currentView ? currentView.url : undefined
  );
  const [chosenUrl, setChosenUrl] = useState<string>();
  const [input, setInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  // Follows the workspace in view until one is chosen, and falls back when the chosen one is removed.
  const targetUrl =
    [chosenUrl, currentUrl].find((url) =>
      servers.some((server) => server.url === url)
    ) ?? servers[0].url;

  // Not a <form>: the settings sections already render inside one.
  const handleAdd = async () => {
    if (!input.trim() || isAdding) {
      return;
    }
    setIsAdding(true);
    setStatus({ color: 'hint', text: t('settings.options.uiPreview.adding') });
    try {
      const result: UiPreviewHistoryResult = await invoke(
        'ui-preview/add',
        input.trim()
      );
      if (result.status === 'failed') {
        setStatus({
          color: 'danger',
          text: t('settings.options.uiPreview.failed', {
            message: result.message,
          }),
        });
      } else {
        setInput('');
        setStatus(null);
      }
    } catch (error) {
      setStatus({
        color: 'danger',
        text: t('settings.options.uiPreview.failed', {
          message: messageOf(error),
        }),
      });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Box display='flex' flexDirection='column' mbe={16}>
      <Box display='flex' alignItems='center'>
        <TextInput
          aria-label={t('settings.options.uiPreview.title')}
          placeholder={t('settings.options.uiPreview.placeholder')}
          value={input}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            setInput(event.currentTarget.value);
            // A failure names what was typed, so editing it makes the message stale.
            if (!isAdding) {
              setStatus(null);
            }
          }}
          onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              handleAdd();
            }
          }}
        />
        <Button
          primary
          mis={8}
          loading={isAdding}
          disabled={isAdding || !input.trim()}
          onClick={handleAdd}
        >
          {t('settings.options.uiPreview.add')}
        </Button>
      </Box>
      {status && (
        <Box fontScale='c1' color={status.color} mbs={4} role='status'>
          {status.text}
        </Box>
      )}
      {servers.length > 1 && history.length > 0 && (
        <Field mbs={16}>
          <FieldLabel>{t('settings.options.uiPreview.applyTo')}</FieldLabel>
          <Select
            aria-label={t('settings.options.uiPreview.applyTo')}
            value={targetUrl}
            options={servers.map(({ title, url }): [string, string] => [
              url,
              title ?? url,
            ])}
            onChange={(key: Key) => setChosenUrl(String(key))}
          />
        </Field>
      )}
      {history.length > 0 && (
        <Box display='flex' flexDirection='column' mbs={16}>
          {history.map((entry) => (
            <UiPreviewHistoryItem
              key={entry.input}
              entry={entry}
              servers={servers}
              targetUrl={targetUrl}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};
