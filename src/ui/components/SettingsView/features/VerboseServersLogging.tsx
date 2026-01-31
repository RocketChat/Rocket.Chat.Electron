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
import { SETTINGS_SET_VERBOSE_SERVERS_LOGGING_CHANGED } from '../../../actions';

type VerboseServersLoggingProps = {
  className?: string;
};

export const VerboseServersLogging = (props: VerboseServersLoggingProps) => {
  const isVerboseServersLoggingEnabled = useSelector(
    ({ isVerboseServersLoggingEnabled }: RootState) =>
      isVerboseServersLoggingEnabled
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.currentTarget.checked;
      dispatch({
        type: SETTINGS_SET_VERBOSE_SERVERS_LOGGING_CHANGED,
        payload: isChecked,
      });
    },
    [dispatch]
  );

  const isVerboseServersLoggingEnabledId = useId();

  return (
    <Field className={props.className}>
      <FieldRow>
        <FieldLabel htmlFor={isVerboseServersLoggingEnabledId}>
          {t('settings.options.verboseServersLogging.title')}
        </FieldLabel>
        <ToggleSwitch
          id={isVerboseServersLoggingEnabledId}
          checked={isVerboseServersLoggingEnabled}
          onChange={handleChange}
        />
      </FieldRow>
      <FieldRow>
        <FieldHint>
          {t('settings.options.verboseServersLogging.description')}
        </FieldHint>
      </FieldRow>
    </Field>
  );
};
