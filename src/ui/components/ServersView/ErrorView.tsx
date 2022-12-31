import {
  Box,
  Button,
  ButtonGroup,
  Margins,
  Throbber,
} from '@rocket.chat/fuselage';
import React, { useState, useEffect, FC } from 'react';
import { useTranslation } from 'react-i18next';

import { FailureImage } from '../FailureImage';
import { ErrorPane } from './styles';

type ErrorViewProps = {
  isFailed: boolean;
  onReload: () => void;
};

const ErrorView: FC<ErrorViewProps> = ({ isFailed, onReload }) => {
  const { t } = useTranslation();

  const [isReloading, setReloading] = useState(false);
  const [counter, setCounter] = useState(60);

  useEffect(() => {
    if (!isFailed) {
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
  }, [isFailed, onReload]);

  const handleReloadButtonClick = (): void => {
    setReloading(true);
    onReload();
    setCounter(60);
  };

  return (
    <ErrorPane isVisible={isFailed || isReloading}>
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
              <Box fontScale='h1'>{t('loadingError.announcement')}</Box>

              <Box fontScale='p1'>{t('loadingError.title')}</Box>
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
                {t('loadingError.reload')} ({counter})
              </Button>
            </ButtonGroup>
          )}
        </Box>
      </Box>
    </ErrorPane>
  );
};

export default ErrorView;
