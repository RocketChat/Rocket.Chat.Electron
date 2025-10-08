import {
  Field,
  FieldHint,
  FieldLabel,
  FieldRow,
  InputBox,
  Box,
} from '@rocket.chat/fuselage';
import { ipcRenderer } from 'electron';
import type { FocusEvent } from 'react';
import { useCallback, useId, useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { SETTINGS_SET_SCREEN_LOCK_TIMEOUT_CHANGED } from '../../../actions';

type ScreenLockProps = {
  className?: string;
};

export const ScreenLock = (props: ScreenLockProps) => {
  const { t } = useTranslation();
  const dispatch = useDispatch<Dispatch<RootAction>>();

  const timeout = useSelector(
    ({ screenLockTimeoutSeconds }: RootState) => screenLockTimeoutSeconds
  );

  const [timeoutValue, setTimeoutValue] = useState<string>(
    timeout !== undefined && timeout !== null ? String(timeout) : '0'
  );
  useEffect(() => {
    setTimeoutValue(
      timeout !== undefined && timeout !== null ? String(timeout) : '0'
    );
  }, [timeout]);

  const handleTimeoutChange = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      const raw = event.target.value;
      const value = parseInt(raw, 10);
      const seconds = Number.isFinite(value) && value >= 0 ? value : 0;
      dispatch({
        type: SETTINGS_SET_SCREEN_LOCK_TIMEOUT_CHANGED,
        payload: seconds,
      });
    },
    [dispatch]
  );

  const handleTimeoutInput = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value;
      setTimeoutValue(raw);
      const value = parseInt(raw, 10);
      const seconds = Number.isFinite(value) && value >= 0 ? value : 0;
      dispatch({
        type: SETTINGS_SET_SCREEN_LOCK_TIMEOUT_CHANGED,
        payload: seconds,
      });
    },
    [dispatch]
  );

  // Controlled password input to avoid reading stale DOM and double-commit races
  const [passwordInput, setPasswordInput] = useState('');
  const skipNextBlurRef = useRef(false);

  const applySetPassword = useCallback(async (password: string) => {
    if (window.electronAPI?.setLockPassword) {
      await window.electronAPI.setLockPassword(password);
    } else if (ipcRenderer && typeof ipcRenderer.invoke === 'function') {
      await ipcRenderer.invoke('lock:set', password);
    } else {
      console.warn('No available API to set lock password');
    }
  }, []);

  const handlePasswordChangeInput = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setPasswordInput(event.target.value);
    },
    []
  );

  const handlePasswordBlur = useCallback(
    async (_event: FocusEvent<HTMLInputElement>) => {
      // Do not commit on blur to avoid accidental changes when focus leaves due to lock overlay
      return;
    },
    []
  );

  const handlePasswordKeyDown = useCallback(
    async (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      const value = passwordInput;
      try {
        if (value) {
          await applySetPassword(value);
        }
      } catch (e) {
        console.error('Failed setting lock password via Enter:', e);
      } finally {
        setPasswordInput('');
        // Prevent the subsequent blur from clearing/resetting the password to empty
        skipNextBlurRef.current = true;
      }
    },
    [applySetPassword, passwordInput]
  );

  const timeoutId = useId();
  const passwordId = useId();

  return (
    <Field className={props.className}>
      <FieldRow>
        <Box display='flex' flexDirection='column'>
          <FieldLabel htmlFor={timeoutId}>
            {t('settings.options.screenLock.timeout.title')}
          </FieldLabel>
          <FieldHint>
            {t('settings.options.screenLock.timeout.description')}
          </FieldHint>
        </Box>
        <Box
          display='flex'
          alignItems='center'
          style={{ gap: 8, paddingTop: 4 }}
        >
          <InputBox
            id={timeoutId}
            value={timeoutValue}
            onChange={handleTimeoutInput}
            onBlur={handleTimeoutChange}
            type='number'
            min={0}
            style={{ width: 96 }}
          />
        </Box>
      </FieldRow>
      <FieldRow>
        <Box display='flex' flexDirection='column'>
          <FieldLabel htmlFor={passwordId}>
            {t('settings.options.screenLock.password.title')}
          </FieldLabel>
          <FieldHint>
            {t('settings.options.screenLock.password.description')}
          </FieldHint>
        </Box>
        <Box display='flex' alignItems='center' style={{ paddingTop: 4 }}>
          <InputBox
            id={passwordId}
            value={passwordInput}
            onChange={handlePasswordChangeInput}
            onBlur={handlePasswordBlur}
            onKeyDown={handlePasswordKeyDown}
            type='password'
            placeholder={t('settings.options.screenLock.password.placeholder')}
            style={{ width: 240 }}
          />
        </Box>
      </FieldRow>
    </Field>
  );
};
