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
import { SETTINGS_SET_VERBOSE_AUTH_LOGGING_CHANGED } from '../../../actions';

type VerboseAuthLoggingProps = {
  className?: string;
};

export const VerboseAuthLogging = (props: VerboseAuthLoggingProps) => {
  const isVerboseAuthLoggingEnabled = useSelector(
    ({ isVerboseAuthLoggingEnabled }: RootState) => isVerboseAuthLoggingEnabled
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.currentTarget.checked;
      dispatch({
        type: SETTINGS_SET_VERBOSE_AUTH_LOGGING_CHANGED,
        payload: isChecked,
      });
    },
    [dispatch]
  );

  const isVerboseAuthLoggingEnabledId = useId();

  return (
    <Field className={props.className}>
      <FieldRow>
        <FieldLabel htmlFor={isVerboseAuthLoggingEnabledId}>
          {t('settings.options.verboseAuthLogging.title')}
        </FieldLabel>
        <ToggleSwitch
          id={isVerboseAuthLoggingEnabledId}
          checked={isVerboseAuthLoggingEnabled}
          onChange={handleChange}
        />
      </FieldRow>
      <FieldRow>
        <FieldHint>
          {t('settings.options.verboseAuthLogging.description')}
        </FieldHint>
      </FieldRow>
    </Field>
  );
};
