import { Box, Button, Select, TextInput } from '@rocket.chat/fuselage';
import type { ChangeEvent, FormEvent, Key } from 'react';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import { invoke } from '../../../../ipc/renderer';
import type { RootState } from '../../../../store/rootReducer';
import { SettingField } from './SettingField';

type UiPreviewProps = {
  className?: string;
};

export const UiPreview = (props: UiPreviewProps) => {
  const servers = useSelector(({ servers }: RootState) => servers);
  const focusedServerUrl = useSelector(({ currentView }: RootState) =>
    typeof currentView === 'object' ? currentView.url : undefined
  );
  const { t } = useTranslation();
  const inputId = useId();

  const [serverUrl, setServerUrl] = useState(
    () => focusedServerUrl ?? servers[0]?.url
  );
  const [input, setInput] = useState('');
  const [active, setActive] = useState<Record<string, string>>({});
  const [isBusy, setIsBusy] = useState(false);

  const refresh = useCallback(async () => {
    setActive(await invoke('ui-preview/list'));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const options = useMemo(
    (): [string, string][] =>
      servers.map((server): [string, string] => [
        server.url,
        server.title ?? server.url,
      ]),
    [servers]
  );

  const run = async (action: () => Promise<unknown>) => {
    setIsBusy(true);
    try {
      await action();
      await refresh();
    } finally {
      setIsBusy(false);
    }
  };

  const handleLoad = (event: FormEvent) => {
    event.preventDefault();
    if (serverUrl && input.trim()) {
      run(() => invoke('ui-preview/apply', serverUrl, input.trim()));
    }
  };

  const handleRestore = () => {
    if (serverUrl) {
      run(() => invoke('ui-preview/restore', serverUrl));
    }
  };

  if (servers.length === 0) {
    return null;
  }

  const activeLabel = serverUrl ? active[serverUrl] : undefined;

  return (
    <SettingField
      className={props.className}
      htmlFor={inputId}
      label={t('settings.options.uiPreview.title')}
      description={t('settings.options.uiPreview.description')}
      hint={
        activeLabel
          ? t('settings.options.uiPreview.active', { label: activeLabel })
          : undefined
      }
    >
      <Box
        is='form'
        display='flex'
        flexDirection='column'
        width='full'
        onSubmit={handleLoad}
      >
        <Select
          aria-label={t('settings.options.uiPreview.server')}
          options={options}
          value={serverUrl}
          onChange={(value: Key) => setServerUrl(String(value))}
        />
        <Box display='flex' alignItems='center' mbs={8}>
          <TextInput
            id={inputId}
            placeholder={t('settings.options.uiPreview.placeholder')}
            value={input}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setInput(event.currentTarget.value)
            }
          />
          <Button
            type='submit'
            primary
            mis={8}
            disabled={isBusy || !input.trim()}
          >
            {t('settings.options.uiPreview.load')}
          </Button>
          <Button
            mis={8}
            disabled={isBusy || !activeLabel}
            onClick={handleRestore}
          >
            {t('settings.options.uiPreview.restore')}
          </Button>
        </Box>
      </Box>
    </SettingField>
  );
};
