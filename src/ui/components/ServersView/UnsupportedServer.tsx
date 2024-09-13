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
  instanceDomain: string;
};

const UnsupportedServer = ({
  isSupported,
  instanceDomain,
}: UnsupportedServerProps) => {
  const { t } = useTranslation();

  const handleMoreInfoButtonClick = (): void => {
    ipcRenderer.invoke(
      'server-view/open-url-on-browser',
      urls.docs.supportedVersions
    );
  };

  return (
    <>
      {isSupported === false && (
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
            </StatesActions>
          </States>
        </Box>
      )}
    </>
  );
};

export default UnsupportedServer;
