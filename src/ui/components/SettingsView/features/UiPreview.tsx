import { Box } from '@rocket.chat/fuselage';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import { invoke } from '../../../../ipc/renderer';
import type { RootState } from '../../../../store/rootReducer';
import { UiPreviewRow } from './UiPreviewRow';

type UiPreviewProps = {
  className?: string;
};

export const UiPreview = (props: UiPreviewProps) => {
  const servers = useSelector(({ servers }: RootState) => servers);
  const { t } = useTranslation();
  const [active, setActive] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    setActive(await invoke('ui-preview/list'));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (servers.length === 0) {
    return null;
  }

  return (
    <Box className={props.className} display='flex' flexDirection='column'>
      <Box fontScale='p2m' color='default'>
        {t('settings.options.uiPreview.title')}
      </Box>
      <Box fontScale='p2' color='hint' mbe={16}>
        {t('settings.options.uiPreview.description')}
      </Box>
      {servers.map((server) => (
        <UiPreviewRow
          key={server.url}
          server={server}
          activeLabel={active[server.url]}
          onChanged={refresh}
        />
      ))}
    </Box>
  );
};
