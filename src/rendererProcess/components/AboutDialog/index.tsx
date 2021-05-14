import {
  Box,
  Button,
  Field,
  Margins,
  Throbber,
  ToggleSwitch,
} from '@rocket.chat/fuselage';
import { useUniqueId, useAutoFocus } from '@rocket.chat/fuselage-hooks';
import React, { useState, useEffect, FC, ChangeEvent } from 'react';
import { useTranslation, Trans } from 'react-i18next';

import {
  ABOUT_DIALOG_TOGGLE_UPDATE_ON_START,
  ABOUT_DIALOG_DISMISSED,
} from '../../../common/actions/uiActions';
import { UPDATES_CHECK_FOR_UPDATES_REQUESTED } from '../../../common/actions/updatesActions';
import { RocketChatLogo } from '../../../common/components/assets/RocketChatLogo';
import { useAppDispatch } from '../../../common/hooks/useAppDispatch';
import { useAppSelector } from '../../../common/hooks/useAppSelector';
import { Dialog } from '../Dialog';

const copyright = `© 2016-${new Date().getFullYear()}, Rocket.Chat`;

export const AboutDialog: FC = () => {
  const appVersion = useAppSelector((state) => state.app.version);
  const doCheckForUpdatesOnStartup = useAppSelector(
    ({ doCheckForUpdatesOnStartup }) => doCheckForUpdatesOnStartup
  );
  const isCheckingForUpdates = useAppSelector(
    ({ isCheckingForUpdates }) => isCheckingForUpdates
  );
  const isEachUpdatesSettingConfigurable = useAppSelector(
    ({ isEachUpdatesSettingConfigurable }) => isEachUpdatesSettingConfigurable
  );
  const isUpdatingAllowed = useAppSelector(
    ({ isUpdatingAllowed }) => isUpdatingAllowed
  );
  const isUpdatingEnabled = useAppSelector(
    ({ isUpdatingEnabled }) => isUpdatingEnabled
  );
  const newUpdateVersion = useAppSelector(
    ({ newUpdateVersion }) => newUpdateVersion
  );
  const openDialog = useAppSelector(({ openDialog }) => openDialog);
  const updateError = useAppSelector(({ updateError }) => updateError);

  const isVisible = openDialog === 'about';
  const canUpdate = isUpdatingAllowed && isUpdatingEnabled;
  const isCheckForUpdatesOnStartupChecked =
    isUpdatingAllowed && isUpdatingEnabled && doCheckForUpdatesOnStartup;
  const canSetCheckForUpdatesOnStartup =
    isUpdatingAllowed && isEachUpdatesSettingConfigurable;

  const dispatch = useAppDispatch();

  const { t } = useTranslation();

  const [
    [checkingForUpdates, checkingForUpdatesMessage],
    setCheckingForUpdates,
  ] = useState([false, null]);

  useEffect(() => {
    if (updateError) {
      setCheckingForUpdates([
        true,
        t('dialog.about.errorWhenLookingForUpdates'),
      ]);

      const messageTimer = setTimeout(() => {
        setCheckingForUpdates([false, null]);
      }, 5000);

      return () => {
        clearTimeout(messageTimer);
      };
    }

    if (isCheckingForUpdates) {
      setCheckingForUpdates([true, null]);
      return undefined;
    }

    if (newUpdateVersion) {
      setCheckingForUpdates([false, null]);
      return undefined;
    }

    setCheckingForUpdates([true, t('dialog.about.noUpdatesAvailable')]);
    const messageTimer = setTimeout(() => {
      setCheckingForUpdates([false, null]);
    }, 5000);

    return () => {
      clearTimeout(messageTimer);
    };
  }, [updateError, isCheckingForUpdates, newUpdateVersion, t]);

  const handleCheckForUpdatesButtonClick = (): void => {
    dispatch({ type: UPDATES_CHECK_FOR_UPDATES_REQUESTED });
  };

  const handleCheckForUpdatesOnStartCheckBoxChange = (
    event: ChangeEvent<HTMLInputElement>
  ): void => {
    dispatch({
      type: ABOUT_DIALOG_TOGGLE_UPDATE_ON_START,
      payload: event.target.checked,
    });
  };

  const checkForUpdatesButtonRef = useAutoFocus(isVisible);
  const checkForUpdatesOnStartupToggleSwitchId = useUniqueId();

  return (
    <Dialog
      isVisible={isVisible}
      onClose={() => dispatch({ type: ABOUT_DIALOG_DISMISSED })}
    >
      <Margins block='x16'>
        <RocketChatLogo />

        <Box alignSelf='center'>
          <Trans t={t} i18nKey='dialog.about.version'>
            Version:
            <Box is='span' fontScale='p2' style={{ userSelect: 'text' }}>
              {{ version: appVersion }}
            </Box>
          </Trans>
        </Box>

        {canUpdate && (
          <Box display='flex' flexDirection='column'>
            <Margins block='x8'>
              {!checkingForUpdates && (
                <Button
                  ref={checkForUpdatesButtonRef}
                  primary
                  type='button'
                  disabled={checkingForUpdates}
                  onClick={handleCheckForUpdatesButtonClick}
                >
                  {t('dialog.about.checkUpdates')}
                </Button>
              )}
            </Margins>

            <Margins inline='auto' block='x8'>
              {checkingForUpdates && (
                <Box>
                  <Margins block='x12'>
                    {checkingForUpdatesMessage ? (
                      <Box fontScale='c1' color='info'>
                        {checkingForUpdatesMessage}
                      </Box>
                    ) : (
                      <Throbber size='x16' />
                    )}
                  </Margins>
                </Box>
              )}

              <Field.Row>
                <ToggleSwitch
                  id={checkForUpdatesOnStartupToggleSwitchId}
                  checked={isCheckForUpdatesOnStartupChecked}
                  disabled={!canSetCheckForUpdatesOnStartup}
                  onChange={handleCheckForUpdatesOnStartCheckBoxChange}
                />
                <Field.Label htmlFor={checkForUpdatesOnStartupToggleSwitchId}>
                  {t('dialog.about.checkUpdatesOnStart')}
                </Field.Label>
              </Field.Row>
            </Margins>
          </Box>
        )}

        <Box alignSelf='center' fontScale='micro'>
          {t('dialog.about.copyright', { copyright })}
        </Box>
      </Margins>
    </Dialog>
  );
};
