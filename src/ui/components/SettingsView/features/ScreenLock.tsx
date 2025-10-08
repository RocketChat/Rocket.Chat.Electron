import {
  Field,
  FieldHint,
  FieldLabel,
  FieldRow,
  InputBox,
  Box,
} from '@rocket.chat/fuselage';
import type { FocusEvent } from 'react';
import { useCallback, useId, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import {
  SETTINGS_SET_SCREEN_LOCK_TIMEOUT_CHANGED,
  SETTINGS_SET_SCREEN_LOCK_PASSWORD_HASHED,
} from '../../../actions';

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

  const handlePasswordChange = useCallback(
    async (event: FocusEvent<HTMLInputElement>) => {
      // Capture the input element and its plaintext value immediately
      const inputEl = event.target as HTMLInputElement;
      const plain = inputEl.value || '';

      // Do not store plaintext in Redux. Send it over the secure IPC channel
      // to the main process which will hash & persist it and return the hashed
      // representation. Handle errors and ensure the plaintext is cleared.
      try {
        // Guard in case electronAPI is not available in non-electron environments
        const setLockPassword = (window as any)?.electronAPI?.setLockPassword;
        if (typeof setLockPassword !== 'function') {
          console.error('secure IPC method setLockPassword is not available');
          // Ensure no plaintext lingers in the input
          try {
            inputEl.value = '';
          } catch (e) {
            // ignore
          }
          return;
        }

        // Call secure IPC method. It should return the hashed stored object (or null).
        const hashed = await setLockPassword(String(plain));

        // Clear plaintext from the input immediately after the roundtrip
        try {
          inputEl.value = '';
        } catch (e) {
          // ignore
        }

        // Only dispatch the hashed result to Redux (no plaintext ever stored)
        dispatch({
          type: SETTINGS_SET_SCREEN_LOCK_PASSWORD_HASHED,
          payload: hashed ?? null,
        });
      } catch (err) {
        // Do not include plaintext in logs; log only that an error occurred
        console.error('Error setting screen lock password via IPC:', err);
        try {
          inputEl.value = '';
        } catch (e) {
          // ignore
        }
      }
    },
    [dispatch]
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
            onBlur={handlePasswordChange}
            type='password'
            placeholder={t('settings.options.screenLock.password.placeholder')}
          />
        </Box>
      </FieldRow>
    </Field>
  );
};
