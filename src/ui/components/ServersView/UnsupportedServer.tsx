import {
  Box,
  Button,
  States,
  StatesActions,
  StatesIcon,
  StatesSubtitle,
  StatesTitle,
} from '@rocket.chat/fuselage';
import { ipcRenderer } from 'electron';
import { useTranslation } from 'react-i18next';

import * as urls from '../../../urls';

type UnsupportedServerProps = {
  isSupported: boolean | undefined;
  fetchState?: 'idle' | 'loading' | 'success' | 'error';
  instanceDomain: string;
  serverUrl: string;
};

const UnsupportedServer = ({
  isSupported,
  fetchState,
  instanceDomain,
  serverUrl,
}: UnsupportedServerProps) => {
  const { t } = useTranslation();

  const handleMoreInfoButtonClick = (): void => {
    ipcRenderer.invoke(
      'server-view/open-url-on-browser',
      urls.docs.supportedVersions
    );
  };

  const handleCheckAgainButtonClick = (): void => {
    ipcRenderer.invoke('refresh-supported-versions', serverUrl);
  };

  // Block whenever a definitive `false` verdict exists, except while a fresh
  // validation is actively in flight ('loading'). The main process is the
  // sole writer of `isSupportedVersion` and only writes `false` based on real
  // evidence (server/cloud/cache/builtin), so a persisted `false` (including
  // hydrated from electron-store with `idle` or undefined fetchState) reflects
  // a previous determination and must keep blocking until a fresh fetch
  // overwrites it.
  const shouldBlock = isSupported === false && fetchState !== 'loading';

  return (
    <>
      {shouldBlock && (
        <Box
          backgroundColor='surface-light'
          display='flex'
          flexDirection='column'
          width='100vw'
          justifyContent='center'
          alignItems='center'
          zIndex={1}
        >
          <States>
            <StatesIcon name='warning' />
            <StatesTitle>
              {t('unsupportedServer.title', {
                instanceDomain,
              })}
            </StatesTitle>
            <StatesSubtitle>
              {t('unsupportedServer.announcement')}
            </StatesSubtitle>
            <StatesActions>
              <Button secondary onClick={handleMoreInfoButtonClick}>
                {t('unsupportedServer.moreInformation')}
              </Button>
              <Button onClick={handleCheckAgainButtonClick}>
                {t('unsupportedServer.checkAgain')}
              </Button>
            </StatesActions>
          </States>
        </Box>
      )}
    </>
  );
};

export default UnsupportedServer;
