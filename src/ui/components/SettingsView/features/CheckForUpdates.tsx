import { Box, Button, Throbber } from '@rocket.chat/fuselage';
import type { ChangeEvent } from 'react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import { invoke } from '../../../../ipc/renderer';
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
  const updateStore = useSelector(({ updateStore }: RootState) => updateStore);
  const isStoreUpdate = updateStore !== null;

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

  // Tracks a check requested from this button through its full
  // requested → checking → settled transition, so the result effect below
  // only acts once a check that actually started here has finished — never on
  // stale state left over from a previous check.
  const [hasRequestedCheck, setHasRequestedCheck] = useState(false);
  const hasCheckStartedRef = useRef(false);

  useEffect(() => {
    if (!hasRequestedCheck) return;

    if (isCheckingForUpdates) {
      hasCheckStartedRef.current = true;
      return;
    }

    if (!hasCheckStartedRef.current) return;

    hasCheckStartedRef.current = false;
    setHasRequestedCheck(false);

    if (!newUpdateVersion) {
      setResultMessage(t('dialog.about.noUpdatesAvailable'));
      setTimeout(() => setResultMessage(null), RESULT_MESSAGE_TIMEOUT);
      return;
    }

    // Opening the panel alone would leave it behind the focused settings
    // window, so bring the root window forward and close this one to
    // guarantee the handover is visible.
    dispatch({ type: UPDATES_PANEL_TOGGLED, payload: true });
    invoke('settings-window/close-requested');
  }, [dispatch, hasRequestedCheck, isCheckingForUpdates, newUpdateVersion, t]);

  const handleCheckClick = useCallback(() => {
    hasCheckStartedRef.current = false;
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

  // Store builds cannot use electron-updater (isUpdatingAllowed is false for
  // mas/windows there on purpose), but they still get a user-initiated check
  // via the store's own lookup/page. Store builds have their own check
  // listener despite isUpdatingAllowed being false, so they stay exempt.
  if (!isStoreUpdate && (!isUpdatingAllowed || !isUpdatingEnabled)) return null;

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
