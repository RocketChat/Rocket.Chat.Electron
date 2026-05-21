import { Box, Button, ButtonGroup } from '@rocket.chat/fuselage';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import { invoke } from '../../../ipc/renderer';
import type { RootAction } from '../../../store/actions';
import type { RootState } from '../../../store/rootReducer';
import type { TelephonyDiagnostics } from '../../../telephony/diagnostics';
import {
  TELEPHONY_DEFAULT_HANDLER_PROMPT_CLOSE,
  TELEPHONY_DEFAULT_HANDLER_PROMPT_OPEN_SETTINGS_CLICKED,
} from '../../actions';
import { Dialog } from '../Dialog';

export const TelephonyDefaultHandlerPromptModal = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const [diagnostics, setDiagnostics] = useState<TelephonyDiagnostics | null>(
    null
  );
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);

  const isVisible = useSelector(
    ({ dialogs }: RootState) =>
      dialogs?.telephonyDefaultHandlerPrompt?.isOpen ?? false
  );

  useEffect(() => {
    if (!isVisible) {
      setDiagnostics(null);
      setLoadingDiagnostics(false);
      return undefined;
    }

    let isCanceled = false;
    setLoadingDiagnostics(true);
    void invoke('telephony/get-diagnostics')
      .then((result) => {
        if (!isCanceled) {
          setDiagnostics(result);
        }
      })
      .catch(() => {
        if (!isCanceled) {
          setDiagnostics(null);
        }
      })
      .finally(() => {
        if (!isCanceled) {
          setLoadingDiagnostics(false);
        }
      });

    return () => {
      isCanceled = true;
    };
  }, [isVisible]);

  const hasActionableFailure = useMemo(
    () =>
      diagnostics?.checks.some(
        (check) =>
          check.status !== 'pass' && check.action === 'openDefaultAppsSettings'
      ) ?? false,
    [diagnostics]
  );

  const showOpenSettingsButton =
    !loadingDiagnostics &&
    hasActionableFailure &&
    (process.platform === 'win32' || process.platform === 'linux');

  const handleClose = () => {
    dispatch({ type: TELEPHONY_DEFAULT_HANDLER_PROMPT_CLOSE });
  };

  const handleOpenSettings = () => {
    dispatch({ type: TELEPHONY_DEFAULT_HANDLER_PROMPT_OPEN_SETTINGS_CLICKED });
    dispatch({ type: TELEPHONY_DEFAULT_HANDLER_PROMPT_CLOSE });
  };

  return (
    <Dialog isVisible={isVisible} onClose={handleClose}>
      <Box width='x480' display='flex' flexDirection='column'>
        <Box fontScale='h3' marginBlockEnd='x4'>
          {t('telephony.defaultHandlerPrompt.title')}
        </Box>
        <Box fontScale='p2' marginBlockEnd='x16'>
          {t('telephony.defaultHandlerPrompt.body')}
        </Box>
        {showOpenSettingsButton && process.platform === 'win32' && (
          <Box fontScale='p2' marginBlockEnd='x12'>
            {t('telephony.defaultHandlerPrompt.bodyWindows')}
          </Box>
        )}
        {showOpenSettingsButton && process.platform === 'linux' && (
          <Box fontScale='p2' marginBlockEnd='x12'>
            {t('telephony.defaultHandlerPrompt.bodyLinux')}
          </Box>
        )}
        <ButtonGroup stretch>
          {showOpenSettingsButton && process.platform === 'win32' && (
            <Button primary onClick={handleOpenSettings}>
              {t('telephony.defaultHandlerPrompt.openSettingsWindows')}
            </Button>
          )}
          {showOpenSettingsButton && process.platform === 'linux' && (
            <Button primary onClick={handleOpenSettings}>
              {t('telephony.defaultHandlerPrompt.openSettingsLinux')}
            </Button>
          )}
          <Button primary={!showOpenSettingsButton} onClick={handleClose}>
            {t('telephony.defaultHandlerPrompt.dismiss')}
          </Button>
        </ButtonGroup>
      </Box>
    </Dialog>
  );
};
