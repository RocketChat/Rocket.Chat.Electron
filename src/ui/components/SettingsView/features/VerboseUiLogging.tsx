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
import { SETTINGS_SET_VERBOSE_UI_LOGGING_CHANGED } from '../../../actions';

type VerboseUiLoggingProps = {
  className?: string;
};

export const VerboseUiLogging = (props: VerboseUiLoggingProps) => {
  const isVerboseUiLoggingEnabled = useSelector(
    ({ isVerboseUiLoggingEnabled }: RootState) => isVerboseUiLoggingEnabled
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.currentTarget.checked;
      dispatch({
        type: SETTINGS_SET_VERBOSE_UI_LOGGING_CHANGED,
        payload: isChecked,
      });
    },
    [dispatch]
  );

  const isVerboseUiLoggingEnabledId = useId();

  return (
    <Field className={props.className}>
      <FieldRow>
        <FieldLabel htmlFor={isVerboseUiLoggingEnabledId}>
          {t('settings.options.verboseUiLogging.title')}
        </FieldLabel>
        <ToggleSwitch
          id={isVerboseUiLoggingEnabledId}
          checked={isVerboseUiLoggingEnabled}
          onChange={handleChange}
        />
      </FieldRow>
      <FieldRow>
        <FieldHint>
          {t('settings.options.verboseUiLogging.description')}
        </FieldHint>
      </FieldRow>
    </Field>
  );
};
