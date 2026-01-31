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
import { SETTINGS_SET_VERBOSE_MAIN_LOGGING_CHANGED } from '../../../actions';

type VerboseMainLoggingProps = {
  className?: string;
};

export const VerboseMainLogging = (props: VerboseMainLoggingProps) => {
  const isVerboseMainLoggingEnabled = useSelector(
    ({ isVerboseMainLoggingEnabled }: RootState) => isVerboseMainLoggingEnabled
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.currentTarget.checked;
      dispatch({
        type: SETTINGS_SET_VERBOSE_MAIN_LOGGING_CHANGED,
        payload: isChecked,
      });
    },
    [dispatch]
  );

  const isVerboseMainLoggingEnabledId = useId();

  return (
    <Field className={props.className}>
      <FieldRow>
        <FieldLabel htmlFor={isVerboseMainLoggingEnabledId}>
          {t('settings.options.verboseMainLogging.title')}
        </FieldLabel>
        <ToggleSwitch
          id={isVerboseMainLoggingEnabledId}
          checked={isVerboseMainLoggingEnabled}
          onChange={handleChange}
        />
      </FieldRow>
      <FieldRow>
        <FieldHint>
          {t('settings.options.verboseMainLogging.description')}
        </FieldHint>
      </FieldRow>
    </Field>
  );
};
