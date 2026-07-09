import { css } from '@rocket.chat/css-in-js';
import {
  Box,
  Button,
  Field,
  FieldLabel,
  FieldRow,
  Icon,
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

/**
 * The About dialog renders inside a native `<dialog>` opened with
 * `showModal()` (top layer). Fuselage's modern `Select` portals its dropdown
 * to `document.body`, which sits below the top-layer dialog, so it cannot be
 * used here (see docs/KNOWN_ISSUES.md). A native `<select>` works because its
 * dropdown is browser-native; we style it with Fuselage color/radius tokens so
 * it stays theme-correct. Dimensions are literal rems (no `--rcx-spacing`
 * custom property exists for raw CSS), matching the x* scale.
 */
const updateChannelSelectClass = css`
  width: 13.75rem;
  height: 2.5rem;
  padding-block: 0.5rem;
  padding-inline: 0.75rem 2.5rem;
  border: 1px solid var(--rcx-color-stroke-light);
  border-radius: var(--rcx-border-radius-medium);
  background-color: var(--rcx-color-surface-tint);
  color: var(--rcx-color-font-default);
  font: inherit;
  outline: 0;
  cursor: pointer;
  appearance: none;

  &:focus {
    border-color: var(--rcx-color-stroke-highlight);
  }

  & option {
    color: var(--rcx-color-font-default);
    background-color: var(--rcx-color-surface-tint);
  }
`;

const updateChannelWrapperClass = css`
  position: relative;
  display: inline-flex;
  align-items: center;

  & > .rcx-icon {
    position: absolute;
    right: 0.75rem;
    pointer-events: none;
  }
`;

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
  const updateChannelSelectId = useId();

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
              <Box mbe='x16'>
                <Field>
                  <FieldRow>
                    <FieldLabel
                      htmlFor={updateChannelSelectId}
                      alignSelf='center'
                    >
                      {t('dialog.about.updateChannel.label')}
                    </FieldLabel>
                    <Box className={updateChannelWrapperClass}>
                      <Box
                        is='select'
                        id={updateChannelSelectId}
                        className={updateChannelSelectClass}
                        value={updateChannel}
                        onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                          handleUpdateChannelChange(e.target.value)
                        }
                      >
                        {updateChannelOptions.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </Box>
                      <Icon name='chevron-down' size='x20' color='hint' />
                    </Box>
                  </FieldRow>
                </Field>
              </Box>
            )}

            <Margins block='x8'>
              {!checkingForUpdates && (
                <Button
                  ref={
                    checkForUpdatesButtonRef as React.RefObject<HTMLButtonElement | null>
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
