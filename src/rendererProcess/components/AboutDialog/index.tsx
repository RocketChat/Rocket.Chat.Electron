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

import * as dialogActions from '../../../common/actions/dialogActions';
import * as updateCheckActions from '../../../common/actions/updateCheckActions';
import { RocketChatLogo } from '../../../common/components/assets/RocketChatLogo';
import { useAppDispatch } from '../../../common/hooks/useAppDispatch';
import { useAppSelector } from '../../../common/hooks/useAppSelector';
import { Dialog } from '../Dialog';

const copyright = `© 2016-${new Date().getFullYear()}, Rocket.Chat`;

export const AboutDialog: FC = () => {
  const appVersion = useAppSelector((state) => state.app.version);
  const checkOnStartup = useAppSelector(
    (state) => state.updates.settings.checkOnStartup
  );
  const isCheckingForUpdates = useAppSelector(
    (state) => state.updates.latest?.status === 'pending'
  );
  const editable = useAppSelector((state) => state.updates.settings.editable);
  const allowed = useAppSelector((state) => state.updates.allowed);
  const enabled = useAppSelector((state) => state.updates.settings.enabled);
  const newUpdateVersion = useAppSelector(
    (state) =>
      state.updates.latest?.status === 'fulfilled' &&
      state.updates.latest.version
  );
  const openDialog = useAppSelector((state) => state.ui.openDialog);
  const updateError = useAppSelector(
    (state) =>
      state.updates.latest?.status === 'rejected' && state.updates.latest.error
  );

  const isVisible = openDialog === 'about';
  const canUpdate = allowed && enabled;
  const checkOnStartupChecked = allowed && enabled && checkOnStartup;
  const canSetCheckForUpdatesOnStartup = allowed && editable;

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
    dispatch(updateCheckActions.requested());
  };

  const handleCheckForUpdatesOnStartCheckBoxChange = (
    event: ChangeEvent<HTMLInputElement>
  ): void => {
    dispatch(updateCheckActions.checkOnStartupToggled(event.target.checked));
  };

  const handleClose = () => {
    dispatch(dialogActions.pop());
  };

  const checkForUpdatesButtonRef = useAutoFocus(isVisible);
  const checkForUpdatesOnStartupToggleSwitchId = useUniqueId();

  return (
    <Dialog isVisible={isVisible} onClose={handleClose}>
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
                  checked={checkOnStartupChecked}
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
