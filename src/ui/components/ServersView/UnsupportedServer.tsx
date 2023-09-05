import { Box, Button, ButtonGroup, Margins } from '@rocket.chat/fuselage';
import type { FC } from 'react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { FailureImage } from '../FailureImage';
import { ErrorPane } from './styles';

type ErrorViewProps = {
  isSupported: boolean;
};

const UnsupportedServer: FC<ErrorViewProps> = ({ isSupported }) => {
  const { t } = useTranslation();

  const handleMoreInfoButtonClick = (): void => {
    window.open(
      'https://docs.rocket.chat/resources/rocket.chats-support-structure/enterprise-support-and-version-durability'
    );
  };

  return (
    <ErrorPane isVisible={!isSupported}>
      <FailureImage
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 0,
        }}
      />
      <Box
        is='section'
        color='alternative'
        display='flex'
        flexDirection='column'
        justifyContent='center'
        alignItems='center'
        zIndex={1}
      >
        <Margins block='x12'>
          <Box display='flex' flexDirection='column'>
            <Margins block='x8' inline='auto'>
              <Box fontScale='h1'>{t('unsupportedServer.title')}</Box>

              <Box fontScale='p1'>{t('unsupportedServer.announcement')}</Box>
            </Margins>
          </Box>
        </Margins>

        <Box>
          <ButtonGroup align='center'>
            <Button primary onClick={handleMoreInfoButtonClick}>
              {t('unsupportedServer.moreInformation')}
            </Button>
          </ButtonGroup>
        </Box>
      </Box>
    </ErrorPane>
  );
};

export default UnsupportedServer;
