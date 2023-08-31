import {
  Box,
  Button,
  ButtonGroup,
  Margins,
  Throbber,
} from '@rocket.chat/fuselage';
import type { FC } from 'react';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { FailureImage } from '../FailureImage';
import { ErrorPane } from './styles';

type ErrorViewProps = {
  isSupported: boolean;
  onReload: () => void;
};

const UnsupportedServer: FC<ErrorViewProps> = ({ isSupported, onReload }) => {
  const { t } = useTranslation();

  const [isReloading, setReloading] = useState(false);
  const [counter, setCounter] = useState(60);

  useEffect(() => {
    if (!isSupported) {
      setReloading(false);
      setCounter(60);
      return undefined;
    }

    const reloadCounterStepSize = 1;
    const timer = setInterval(() => {
      setCounter((counter) => {
        counter -= reloadCounterStepSize;

        if (counter <= 0) {
          setReloading(true);
          onReload();
          return 60;
        }

        return counter;
      });
    }, reloadCounterStepSize * 1000);

    return () => {
      clearInterval(timer);
    };
  }, [isSupported, onReload]);

  const handleReloadButtonClick = (): void => {
    setReloading(true);
    onReload();
    setCounter(60);
  };

  return (
    <ErrorPane isVisible={!isSupported || isReloading}>
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
          {isReloading && (
            <Margins block='x12'>
              <Throbber inheritColor size='x16' />
            </Margins>
          )}

          {!isReloading && (
            <ButtonGroup align='center'>
              <Button primary onClick={handleReloadButtonClick}>
                {t('unsupportedServer.moreInformation')} ({counter})
              </Button>
            </ButtonGroup>
          )}
        </Box>
      </Box>
    </ErrorPane>
  );
};

export default UnsupportedServer;
