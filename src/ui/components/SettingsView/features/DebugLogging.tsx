import {
  ToggleSwitch,
  Field,
  FieldRow,
  FieldLabel,
  FieldHint,
} from '@rocket.chat/fuselage';
import type { ChangeEvent } from 'react';
import { useCallback, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { SETTINGS_SET_DEBUG_LOGGING_CHANGED } from '../../../actions';

type DebugLoggingProps = {
  className?: string;
};

export const DebugLogging = (props: DebugLoggingProps) => {
  const isDebugLoggingEnabled = useSelector(
    ({ isDebugLoggingEnabled }: RootState) => isDebugLoggingEnabled
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.currentTarget.checked;
      dispatch({
        type: SETTINGS_SET_DEBUG_LOGGING_CHANGED,
        payload: isChecked,
      });
    },
    [dispatch]
  );

  const isDebugLoggingEnabledId = useId();

  return (
    <Field className={props.className}>
      <FieldRow>
        <FieldLabel htmlFor={isDebugLoggingEnabledId}>
          {t('settings.options.debugLogging.title')}
        </FieldLabel>
        <ToggleSwitch
          id={isDebugLoggingEnabledId}
          checked={isDebugLoggingEnabled}
          onChange={handleChange}
        />
      </FieldRow>
      <FieldRow>
        <FieldHint>{t('settings.options.debugLogging.description')}</FieldHint>
      </FieldRow>
    </Field>
  );
};
