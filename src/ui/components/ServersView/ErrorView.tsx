import {
  Box,
  Button,
  ButtonGroup,
  Margins,
  Throbber,
} from '@rocket.chat/fuselage';
import { clipboard } from 'electron';
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import type { ServerFailure } from '../../../servers/common';
import type { RootState } from '../../../store/rootReducer';
import { FailureImage } from '../FailureImage';
import { formatFailureDetails, getFailureEnvironment } from './failureDetails';

type ErrorViewProps = {
  isFailed: boolean;
  serverUrl: string;
  failure?: ServerFailure;
  onReload: () => void;
};

const COPIED_FEEDBACK_MS = 2000;

const useFailureCause = (failure: ServerFailure | undefined) => {
  const { t } = useTranslation();

  if (!failure) {
    return undefined;
  }

  switch (failure.kind) {
    case 'load-failed':
      return t('loadingError.cause.loadFailed', {
        error: failure.errorDescription ?? failure.errorCode,
      });

    case 'unresponsive':
      return t('loadingError.cause.unresponsive');

    case 'stuck':
      return t('loadingError.cause.stuck', { reason: failure.reason });

    case 'renderer-gone':
      return t('loadingError.cause.rendererGone', { reason: failure.reason });
  }
};

const ErrorView = ({
  isFailed,
  serverUrl,
  failure,
  onReload,
}: ErrorViewProps) => {
  const { t } = useTranslation();
  const appVersion = useSelector(({ appVersion }: RootState) => appVersion);

  const [isReloading, setReloading] = useState(false);
  const [counter, setCounter] = useState(60);
  const [isCopied, setCopied] = useState(false);
  const [isDetailsVisible, setDetailsVisible] = useState(false);

  const cause = useFailureCause(failure);
  const details = useMemo(
    () =>
      failure &&
      formatFailureDetails(
        serverUrl,
        failure,
        getFailureEnvironment(appVersion)
      ),
    [serverUrl, failure, appVersion]
  );

  useEffect(() => {
    if (!isFailed) {
      setReloading(false);
      setCounter(60);
      setDetailsVisible(false);
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

  useEffect(() => {
    if (!isCopied) {
      return undefined;
    }

    const timer = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [isCopied]);

  useEffect(() => {
    setCopied(false);
  }, [failure]);

  const handleReloadButtonClick = (): void => {
    setReloading(true);
    onReload();
    setCounter(60);
  };

  const handleCopyButtonClick = (): void => {
    if (!details) {
      return;
    }

    // navigator.clipboard refuses to write while the window is not focused.
    clipboard.writeText(details);
    setCopied(true);
  };

  const handleDetailsButtonClick = (): void => {
    setDetailsVisible((isDetailsVisible) => !isDetailsVisible);
  };

  return (
    <>
      {(isFailed || isReloading) && (
        <Box
          display='flex'
          flexDirection='column'
          width='100vw'
          justifyContent='center'
          alignItems='center'
          zIndex={1}
        >
          <FailureImage
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: 0,
            }}
          />
          <Box is='section' color='pure-white' zIndex={1} maxWidth='100%'>
            <Margins block='x12'>
              <Box display='flex' flexDirection='column' alignItems='center'>
                <Margins block='x8' inline='auto'>
                  <Box fontScale='h1'>{t('loadingError.announcement')}</Box>

                  <Box fontScale='p1'>{t('loadingError.title')}</Box>

                  {isFailed && cause && (
                    <Box fontScale='p2' textAlign='center'>
                      {cause}
                    </Box>
                  )}
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
                  {details && (
                    <Button secondary onClick={handleCopyButtonClick}>
                      {isCopied
                        ? t('loadingError.copied')
                        : t('loadingError.copyDetails')}
                    </Button>
                  )}
                  {details && (
                    <Button
                      secondary
                      aria-expanded={isDetailsVisible}
                      onClick={handleDetailsButtonClick}
                    >
                      {isDetailsVisible
                        ? t('loadingError.hideDetails')
                        : t('loadingError.showDetails')}
                    </Button>
                  )}
                </ButtonGroup>
              )}

              {!isReloading && details && isDetailsVisible && (
                <Margins block='x16'>
                  <Box
                    is='pre'
                    bg='light'
                    color='default'
                    fontFamily='mono'
                    fontScale='c1'
                    p={16}
                    borderRadius={4}
                    maxWidth='x640'
                    mi='auto'
                    overflow='auto'
                    textAlign='left'
                    style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
                  >
                    {details}
                  </Box>
                </Margins>
              )}
            </Box>
          </Box>
        </Box>
      )}
    </>
  );
};

export default ErrorView;
