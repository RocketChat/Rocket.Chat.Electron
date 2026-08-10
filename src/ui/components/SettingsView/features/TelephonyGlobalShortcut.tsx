import { Box, Button, FieldHint, TextInput } from '@rocket.chat/fuselage';
import type { KeyboardEvent } from 'react';
import { useCallback, useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { formatAcceleratorForDisplay } from '../../../../telephony/acceleratorDisplay';
import { TELEPHONY_GLOBAL_SHORTCUT_CONFIG_SET } from '../../../../telephony/actions';
import {
  isReservedTelephonyShortcutAccelerator,
  normalizeTelephonyShortcutAccelerator,
} from '../../../../telephony/shortcuts';
import { SettingField } from './SettingField';

const normalizeShortcutText = (value: string): string | null =>
  normalizeTelephonyShortcutAccelerator(value);

const keyToAcceleratorPart = (key: string): string | null => {
  if (['Control', 'Meta', 'Shift', 'Alt'].includes(key)) {
    return null;
  }

  if (key === ' ') {
    return 'Space';
  }

  if (/^[a-z]$/i.test(key)) {
    return key.toUpperCase();
  }

  return key.length === 1 ? key.toUpperCase() : key;
};

const eventToAccelerator = (event: KeyboardEvent<HTMLInputElement>) => {
  const key = keyToAcceleratorPart(event.key);
  if (!key) {
    return null;
  }

  const parts = [];

  if (event.ctrlKey || event.metaKey) {
    parts.push('CommandOrControl');
  }

  if (event.altKey) {
    parts.push('Alt');
  }

  if (event.shiftKey) {
    parts.push('Shift');
  }

  parts.push(key);

  return parts.join('+');
};

type TelephonyGlobalShortcutProps = {
  className?: string;
};

export const TelephonyGlobalShortcut = (
  props: TelephonyGlobalShortcutProps
) => {
  const { t } = useTranslation();
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const telephonyGlobalShortcutConfig = useSelector(
    ({ telephonyGlobalShortcutConfig }: RootState) =>
      telephonyGlobalShortcutConfig
  );
  const telephonyGlobalShortcutRegistrationStatus = useSelector(
    ({ telephonyGlobalShortcutRegistrationStatus }: RootState) =>
      telephonyGlobalShortcutRegistrationStatus
  );
  const isTelephonyEnabled = useSelector(
    ({ isTelephonyEnabled }: RootState) => isTelephonyEnabled
  );
  const [draftAccelerator, setDraftAccelerator] = useState(
    telephonyGlobalShortcutConfig.accelerator ?? ''
  );
  const [isCapturingShortcut, setIsCapturingShortcut] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setDraftAccelerator(telephonyGlobalShortcutConfig.accelerator ?? '');
  }, [telephonyGlobalShortcutConfig.accelerator]);

  const saveShortcut = useCallback(
    (value: string) => {
      const accelerator = normalizeShortcutText(value);
      if (accelerator && isReservedTelephonyShortcutAccelerator(accelerator)) {
        setValidationError(
          t('settings.options.telephonyShortcut.reservedByApp', {
            accelerator: formatAcceleratorForDisplay(accelerator),
          })
        );
        return;
      }

      setValidationError(null);
      dispatch({
        type: TELEPHONY_GLOBAL_SHORTCUT_CONFIG_SET,
        payload: {
          enabled: Boolean(accelerator),
          accelerator,
        },
      });
    },
    [dispatch, t]
  );

  const handleFocus = useCallback(() => {
    setIsCapturingShortcut(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsCapturingShortcut(false);
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      const accelerator = eventToAccelerator(event);
      if (event.key === 'Escape') {
        event.preventDefault();
        setDraftAccelerator(telephonyGlobalShortcutConfig.accelerator ?? '');
        setIsCapturingShortcut(false);
        setValidationError(null);
        return;
      }

      if (!accelerator) {
        return;
      }

      event.preventDefault();
      setDraftAccelerator(accelerator);
      setIsCapturingShortcut(false);
      setValidationError(null);
    },
    [telephonyGlobalShortcutConfig.accelerator]
  );

  const handleSave = useCallback(() => {
    saveShortcut(draftAccelerator);
  }, [draftAccelerator, saveShortcut]);

  const handleClear = useCallback(() => {
    setDraftAccelerator('');
    saveShortcut('');
  }, [saveShortcut]);

  const isRegistered =
    telephonyGlobalShortcutConfig.enabled &&
    telephonyGlobalShortcutRegistrationStatus.registered &&
    telephonyGlobalShortcutRegistrationStatus.accelerator ===
      telephonyGlobalShortcutConfig.accelerator;

  const shortcutInputId = useId();

  return (
    <SettingField
      className={props.className}
      htmlFor={shortcutInputId}
      label={t('settings.options.telephonyShortcut.title')}
      description={t('settings.options.telephonyShortcut.description')}
    >
      <Box display='flex' flexDirection='column' flexGrow={1}>
        <Box display='flex' alignItems='center'>
          <TextInput
            id={shortcutInputId}
            data-testid='telephony-shortcut-input'
            disabled={!isTelephonyEnabled}
            readOnly
            value={formatAcceleratorForDisplay(draftAccelerator)}
            placeholder={t(
              isCapturingShortcut
                ? 'settings.options.telephonyShortcut.capturePlaceholder'
                : 'settings.options.telephonyShortcut.placeholder'
            )}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
          />
          <Button
            data-testid='telephony-shortcut-save'
            disabled={!isTelephonyEnabled}
            type='button'
            onClick={handleSave}
            mis='x8'
          >
            {t('settings.options.telephonyShortcut.save')}
          </Button>
          <Button
            data-testid='telephony-shortcut-clear'
            disabled={!isTelephonyEnabled}
            type='button'
            onClick={handleClear}
            mis='x8'
          >
            {t('settings.options.telephonyShortcut.clear')}
          </Button>
        </Box>

        {telephonyGlobalShortcutRegistrationStatus.error && (
          <FieldHint color='danger'>
            {telephonyGlobalShortcutRegistrationStatus.error}
          </FieldHint>
        )}
        {validationError && (
          <FieldHint color='danger'>{validationError}</FieldHint>
        )}
        {isRegistered && (
          <FieldHint>
            {t('settings.options.telephonyShortcut.registered')}
          </FieldHint>
        )}
      </Box>
    </SettingField>
  );
};
