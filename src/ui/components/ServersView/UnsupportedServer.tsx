import {
  Box,
  Button,
  ButtonGroup,
  Icon,
  Margins,
  Skeleton,
} from '@rocket.chat/fuselage';
import type { FC } from 'react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { ErrorPane } from './styles';

type UnsupportedServerProps = {
  isSupported: boolean;
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
    <ErrorPane isVisible={!isSupported}>
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
        <Box>
          <Margins block='x12'>
            <Box display='flex' flexDirection='column'>
              <Icon
                color='danger'
                name='warning'
                size={64}
                style={{ alignSelf: 'center' }}
              />
              <Margins block='x8' inline='auto'>
                <Box fontScale='h3'>
                  {t('unsupportedServer.title', {
                    workspaceName,
                  })}
                </Box>

                <Box fontScale='p2'>{t('unsupportedServer.announcement')}</Box>
              </Margins>
            </Box>
          </Margins>

          <Box>
            <ButtonGroup align='center'>
              <Button secondary onClick={handleMoreInfoButtonClick}>
                {t('unsupportedServer.moreInformation')}
              </Button>
            </ButtonGroup>
          </Box>
        </Box>
      </Box>
    </ErrorPane>
  );
};

export default UnsupportedServer;
