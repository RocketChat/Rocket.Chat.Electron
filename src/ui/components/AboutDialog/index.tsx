import {
  Box,
  Button,
  Field,
  FieldLabel,
  FieldRow,
  Margins,
  Throbber,
  ToggleSwitch,
} from '@rocket.chat/fuselage';
import { useAutoFocus } from '@rocket.chat/fuselage-hooks';
import type { ChangeEvent } from 'react';
import React, { useState, useEffect, useId } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import { packageJsonInformation } from '../../../app/main/app';
import type { RootAction } from '../../../store/actions';
import type { RootState } from '../../../store/rootReducer';
import { UPDATES_CHECK_FOR_UPDATES_REQUESTED } from '../../../updates/actions';
import { UPDATE_CHANNELS } from '../../../updates/common';
import {
  ABOUT_DIALOG_TOGGLE_UPDATE_ON_START,
  ABOUT_DIALOG_DISMISSED,
  ABOUT_DIALOG_UPDATE_CHANNEL_CHANGED,
} from '../../actions';
import { Dialog } from '../Dialog';
import { RocketChatLogo } from '../RocketChatLogo';

const copyright = `© 2016-${new Date().getFullYear()}, ${
  packageJsonInformation.productName
}`;

export const AboutDialog = () => {
  const appVersion = useSelector(({ appVersion }: RootState) => appVersion);
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
  const openDialog = useSelector(({ openDialog }: RootState) => openDialog);
  const updateError = useSelector(({ updateError }: RootState) => updateError);
  const updateChannel = useSelector(
    ({ updateChannel }: RootState) => updateChannel
  );
  const isDeveloperModeEnabled = useSelector(
    ({ isDeveloperModeEnabled }: RootState) => isDeveloperModeEnabled
  );

  const isVisible = openDialog === 'about';
  const canUpdate = isUpdatingAllowed && isUpdatingEnabled;
  const isCheckForUpdatesOnStartupChecked =
    isUpdatingAllowed && isUpdatingEnabled && doCheckForUpdatesOnStartup;
  const canSetCheckForUpdatesOnStartup =
    isUpdatingAllowed && isEachUpdatesSettingConfigurable;

  const dispatch = useDispatch<Dispatch<RootAction>>();

  const { t } = useTranslation();

  const [
    [checkingForUpdates, checkingForUpdatesMessage],
    setCheckingForUpdates,
  ] = useState<[boolean, string | null]>([false, null]);

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

  const handleUpdateChannelChange = (channel: string): void => {
    dispatch({
      type: ABOUT_DIALOG_UPDATE_CHANNEL_CHANGED,
      payload: channel,
    });
  };

  const checkForUpdatesButtonRef = useAutoFocus(isVisible);
  const checkForUpdatesOnStartupToggleSwitchId = useId();

  const updateChannelOptions = UPDATE_CHANNELS.map(
    (channel) =>
      [channel, t(`dialog.about.updateChannel.${channel}`)] as [string, string]
  ).sort((a, b) => a[1].localeCompare(b[1]));

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
              <>{{ version: appVersion }}</>
            </Box>
          </Trans>
        </Box>

        {canUpdate && (
          <Box display='flex' flexDirection='column'>
            {isDeveloperModeEnabled && (
              <Box marginBlockEnd={16}>
                <Field>
                  <FieldRow style={{ verticalAlign: 'middle' }}>
                    <FieldLabel
                      htmlFor='updateChannelSelect'
                      marginBlock='auto'
                    >
                      {t('dialog.about.updateChannel.label')}
                    </FieldLabel>
                    <select
                      id='updateChannelSelect'
                      value={updateChannel}
                      onChange={(e) =>
                        handleUpdateChannelChange(e.target.value)
                      }
                      style={{
                        width: '200px',
                        height: '40px',
                        padding: '8px 12px',
                        border: '2px solid #e4e7ea',
                        borderRadius: '4px',
                        backgroundColor: '#ffffff',
                        fontSize: '14px',
                        color: '#2f343d',
                        outline: 'none',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        appearance: 'none',
                        backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 12px center',
                        backgroundSize: '16px',
                        paddingRight: '40px',
                      }}
                    >
                      {updateChannelOptions.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </FieldRow>
                </Field>
              </Box>
            )}

            <Margins block='x8'>
              {!checkingForUpdates && (
                <Button
                  ref={
                    checkForUpdatesButtonRef as React.RefObject<HTMLButtonElement>
                  }
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

              <Field>
                <FieldRow>
                  <FieldLabel htmlFor={checkForUpdatesOnStartupToggleSwitchId}>
                    {t('dialog.about.checkUpdatesOnStart')}
                  </FieldLabel>
                  <ToggleSwitch
                    id={checkForUpdatesOnStartupToggleSwitchId}
                    checked={isCheckForUpdatesOnStartupChecked}
                    disabled={!canSetCheckForUpdatesOnStartup}
                    onChange={handleCheckForUpdatesOnStartCheckBoxChange}
                  />
                </FieldRow>
              </Field>
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
