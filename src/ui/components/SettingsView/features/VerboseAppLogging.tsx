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
import { SETTINGS_SET_VERBOSE_APP_LOGGING_CHANGED } from '../../../actions';

type VerboseAppLoggingProps = {
  className?: string;
};

export const VerboseAppLogging = (props: VerboseAppLoggingProps) => {
  const isVerboseAppLoggingEnabled = useSelector(
    ({ isVerboseAppLoggingEnabled }: RootState) => isVerboseAppLoggingEnabled
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.currentTarget.checked;
      dispatch({
        type: SETTINGS_SET_VERBOSE_APP_LOGGING_CHANGED,
        payload: isChecked,
      });
    },
    [dispatch]
  );

  const isVerboseAppLoggingEnabledId = useId();

  return (
    <Field className={props.className}>
      <FieldRow>
        <FieldLabel htmlFor={isVerboseAppLoggingEnabledId}>
          {t('settings.options.verboseAppLogging.title')}
        </FieldLabel>
        <ToggleSwitch
          id={isVerboseAppLoggingEnabledId}
          checked={isVerboseAppLoggingEnabled}
          onChange={handleChange}
        />
      </FieldRow>
      <FieldRow>
        <FieldHint>
          {t('settings.options.verboseAppLogging.description')}
        </FieldHint>
      </FieldRow>
    </Field>
  );
};
