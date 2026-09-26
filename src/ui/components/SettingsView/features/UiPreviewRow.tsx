import {
  Box,
  Button,
  Field,
  FieldLabel,
  TextInput,
} from '@rocket.chat/fuselage';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { invoke } from '../../../../ipc/renderer';
import type { Server } from '../../../../servers/common';
import type { UiPreviewResult } from '../../../main/serverView/uiPreview';

type RowState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'done'; result: UiPreviewResult };

type UiPreviewRowProps = {
  server: Server;
  activeLabel: string | undefined;
  onChanged: () => Promise<void>;
};

export const UiPreviewRow = ({
  server,
  activeLabel,
  onChanged,
}: UiPreviewRowProps) => {
  const { t } = useTranslation();
  const inputId = useId();
  const [input, setInput] = useState('');
  const [state, setState] = useState<RowState>({ kind: 'idle' });

  const isLoading = state.kind === 'loading';

  // Not a <form>: the settings sections already render inside one.
  const handleLoad = async () => {
    if (!input.trim() || isLoading) {
      return;
    }
    setState({ kind: 'loading' });
    const result = await invoke('ui-preview/apply', server.url, input.trim());
    setState({ kind: 'done', result });
    await onChanged();
  };

  const handleRestore = async () => {
    setState({ kind: 'loading' });
    await invoke('ui-preview/restore', server.url);
    setState({ kind: 'idle' });
    await onChanged();
  };

  const status = (() => {
    if (state.kind === 'loading') {
      return { color: 'hint', text: t('settings.options.uiPreview.loading') };
    }
    if (state.kind === 'done' && state.result.status === 'failed') {
      return {
        color: 'danger',
        text: t('settings.options.uiPreview.failed', {
          message: state.result.message,
        }),
      };
    }
    if (activeLabel) {
      return {
        color: 'status-font-on-success',
        text: t('settings.options.uiPreview.active', { label: activeLabel }),
      };
    }
    if (state.kind === 'done' && state.result.status === 'cancelled') {
      return { color: 'hint', text: t('settings.options.uiPreview.cancelled') };
    }
    return { color: 'hint', text: t('settings.options.uiPreview.inactive') };
  })();

  return (
    <Field mbe={16}>
      <FieldLabel htmlFor={inputId}>{server.title ?? server.url}</FieldLabel>
      <Box fontScale='c1' color='hint'>
        {server.url}
      </Box>
      <Box display='flex' alignItems='center' mbs={8}>
        <TextInput
          id={inputId}
          placeholder={t('settings.options.uiPreview.placeholder')}
          value={input}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            setInput(event.currentTarget.value)
          }
          onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              handleLoad();
            }
          }}
        />
        <Button
          primary
          mis={8}
          loading={isLoading}
          disabled={isLoading || !input.trim()}
          onClick={handleLoad}
        >
          {t('settings.options.uiPreview.load')}
        </Button>
        <Button
          mis={8}
          disabled={isLoading || !activeLabel}
          onClick={handleRestore}
        >
          {t('settings.options.uiPreview.restore')}
        </Button>
      </Box>
      <Box fontScale='c1' color={status.color} mbs={4} role='status'>
        {status.text}
      </Box>
    </Field>
  );
};
