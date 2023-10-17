import {
  Box,
  Button,
  States,
  StatesActions,
  StatesIcon,
  StatesSubtitle,
  StatesTitle,
} from '@rocket.chat/fuselage';
import type { FC } from 'react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { ErrorPane } from './styles';

type UnsupportedServerProps = {
  isSupported: boolean | undefined;
  workspaceName: string;
};

const UnsupportedServer: FC<UnsupportedServerProps> = ({
  isSupported,
  workspaceName,
}) => {
  const { t } = useTranslation();

  const handleMoreInfoButtonClick = (): void => {
    window.open(
      'https://docs.rocket.chat/resources/rocket.chats-support-structure/enterprise-support-and-version-durability'
    );
  };

  return (
    <ErrorPane isVisible={isSupported === false}>
      <Box
        backgroundColor='white'
        display='flex'
        flexDirection='column'
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 0,
        }}
        justifyContent='center'
        alignItems='center'
        zIndex={1}
      >
        <States>
          <StatesIcon name='warning' />
          <StatesTitle>
            {t('unsupportedServer.title', {
              workspaceName,
            })}
          </StatesTitle>
          <StatesSubtitle>{t('unsupportedServer.announcement')}</StatesSubtitle>
          <StatesActions>
            <Button secondary onClick={handleMoreInfoButtonClick}>
              {t('unsupportedServer.moreInformation')}
            </Button>
          </StatesActions>
        </States>
      </Box>
    </ErrorPane>
  );
};

export default UnsupportedServer;
