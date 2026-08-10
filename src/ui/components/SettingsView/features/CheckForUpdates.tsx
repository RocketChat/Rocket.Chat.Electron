import { Box, Button, Throbber } from '@rocket.chat/fuselage';
import type { ChangeEvent } from 'react';
import { useCallback, useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import {
  UPDATES_CHECK_FOR_UPDATES_REQUESTED,
  UPDATES_PANEL_TOGGLED,
} from '../../../../updates/actions';
import { ABOUT_DIALOG_TOGGLE_UPDATE_ON_START } from '../../../actions';
import { ToggleField } from './ToggleField';

/** How long a finished check keeps reporting its result before resetting. */
const RESULT_MESSAGE_TIMEOUT = 5000;

type CheckForUpdatesProps = {
  className?: string;
};

/**
 * Whether to check for updates at every launch, and a button to check right
 * now — one row rather than two, because they are the same decision seen from
 * two angles: the automatic check and the manual one.
 *
 * A check that finds something hands over to the titlebar update panel, which
 * owns the install flow, so the version details and the install action live in
 * exactly one place rather than being repeated here.
 */
export const CheckForUpdates = (props: CheckForUpdatesProps) => {
  const { t } = useTranslation();
  const dispatch = useDispatch<Dispatch<RootAction>>();

  const doCheckForUpdatesOnStartup = useSelector(
    ({ doCheckForUpdatesOnStartup }: RootState) => doCheckForUpdatesOnStartup
  );
  const isCheckingForUpdates = useSelector(
    ({ isCheckingForUpdates }: RootState) => isCheckingForUpdates
  );
  const isEachUpdatesSettingConfigurable = useSelector(
    ({ isEachUpdatesSettingConfigurable }: RootState) =>
      isEachUpdatesSettingConfigurable
  );
  const isUpdatingAllowed = useSelector(
    ({ isUpdatingAllowed }: RootState) => isUpdatingAllowed
  );
  const isUpdatingEnabled = useSelector(
    ({ isUpdatingEnabled }: RootState) => isUpdatingEnabled
  );
  const newUpdateVersion = useSelector(
    ({ newUpdateVersion }: RootState) => newUpdateVersion
  );
  const updateError = useSelector(({ updateError }: RootState) => updateError);

  const [resultMessage, setResultMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isCheckingForUpdates) {
      setResultMessage(null);
      return undefined;
    }

    if (updateError) {
      setResultMessage(t('dialog.about.errorWhenLookingForUpdates'));
    } else if (newUpdateVersion) {
      setResultMessage(
        t('dialog.about.updateAvailable', { version: newUpdateVersion })
      );
    } else {
      return undefined;
    }

    const timer = setTimeout(
      () => setResultMessage(null),
      RESULT_MESSAGE_TIMEOUT
    );
    return () => clearTimeout(timer);
  }, [isCheckingForUpdates, newUpdateVersion, t, updateError]);

  // Set while a check started here is in flight, so only a manual check hands
  // over to the titlebar panel.
  const [hasRequestedCheck, setHasRequestedCheck] = useState(false);

  useEffect(() => {
    if (!hasRequestedCheck || isCheckingForUpdates) return undefined;

    if (!newUpdateVersion) {
      setHasRequestedCheck(false);
      setResultMessage(t('dialog.about.noUpdatesAvailable'));
      const timer = setTimeout(
        () => setResultMessage(null),
        RESULT_MESSAGE_TIMEOUT
      );
      return () => clearTimeout(timer);
    }

    setHasRequestedCheck(false);
    dispatch({ type: UPDATES_PANEL_TOGGLED, payload: true });
    return undefined;
  }, [dispatch, hasRequestedCheck, isCheckingForUpdates, newUpdateVersion, t]);

  const handleCheckClick = useCallback(() => {
    setHasRequestedCheck(true);
    dispatch({ type: UPDATES_CHECK_FOR_UPDATES_REQUESTED });
  }, [dispatch]);

  const handleOnStartupChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      dispatch({
        type: ABOUT_DIALOG_TOGGLE_UPDATE_ON_START,
        payload: event.currentTarget.checked,
      });
    },
    [dispatch]
  );

  const fieldId = useId();

  if (!isUpdatingAllowed || !isUpdatingEnabled) return null;

  return (
    <ToggleField
      className={props.className}
      id={fieldId}
      label={t('dialog.about.checkUpdatesOnStart')}
      description={t('dialog.about.checkUpdatesOnStartDescription')}
      checked={doCheckForUpdatesOnStartup}
      disabled={!isEachUpdatesSettingConfigurable}
      onChange={handleOnStartupChange}
    >
      <Box display='flex' alignItems='center' paddingBlockStart='x8'>
        <Button
          primary
          type='button'
          disabled={isCheckingForUpdates}
          onClick={handleCheckClick}
        >
          {t('dialog.about.checkUpdates')}
        </Button>
        <Box marginInlineStart='x12' display='flex' alignItems='center'>
          {isCheckingForUpdates && <Throbber size='x16' />}
          {!isCheckingForUpdates && resultMessage && (
            <Box fontScale='c1' color='info'>
              {resultMessage}
            </Box>
          )}
        </Box>
      </Box>
    </ToggleField>
  );
};
