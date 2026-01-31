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
import { SETTINGS_SET_VERBOSE_UPDATES_LOGGING_CHANGED } from '../../../actions';

type VerboseUpdatesLoggingProps = {
  className?: string;
};

export const VerboseUpdatesLogging = (props: VerboseUpdatesLoggingProps) => {
  const isVerboseUpdatesLoggingEnabled = useSelector(
    ({ isVerboseUpdatesLoggingEnabled }: RootState) =>
      isVerboseUpdatesLoggingEnabled
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.currentTarget.checked;
      dispatch({
        type: SETTINGS_SET_VERBOSE_UPDATES_LOGGING_CHANGED,
        payload: isChecked,
      });
    },
    [dispatch]
  );

  const isVerboseUpdatesLoggingEnabledId = useId();

  return (
    <Field className={props.className}>
      <FieldRow>
        <FieldLabel htmlFor={isVerboseUpdatesLoggingEnabledId}>
          {t('settings.options.verboseUpdatesLogging.title')}
        </FieldLabel>
        <ToggleSwitch
          id={isVerboseUpdatesLoggingEnabledId}
          checked={isVerboseUpdatesLoggingEnabled}
          onChange={handleChange}
        />
      </FieldRow>
      <FieldRow>
        <FieldHint>
          {t('settings.options.verboseUpdatesLogging.description')}
        </FieldHint>
      </FieldRow>
    </Field>
  );
};
