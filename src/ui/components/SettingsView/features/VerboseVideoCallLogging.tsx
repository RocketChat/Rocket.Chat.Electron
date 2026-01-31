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
import { SETTINGS_SET_VERBOSE_VIDEOCALL_LOGGING_CHANGED } from '../../../actions';

type VerboseVideoCallLoggingProps = {
  className?: string;
};

export const VerboseVideoCallLogging = (
  props: VerboseVideoCallLoggingProps
) => {
  const isVerboseVideoCallLoggingEnabled = useSelector(
    ({ isVerboseVideoCallLoggingEnabled }: RootState) =>
      isVerboseVideoCallLoggingEnabled
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.currentTarget.checked;
      dispatch({
        type: SETTINGS_SET_VERBOSE_VIDEOCALL_LOGGING_CHANGED,
        payload: isChecked,
      });
    },
    [dispatch]
  );

  const isVerboseVideoCallLoggingEnabledId = useId();

  return (
    <Field className={props.className}>
      <FieldRow>
        <FieldLabel htmlFor={isVerboseVideoCallLoggingEnabledId}>
          {t('settings.options.verboseVideoCallLogging.title')}
        </FieldLabel>
        <ToggleSwitch
          id={isVerboseVideoCallLoggingEnabledId}
          checked={isVerboseVideoCallLoggingEnabled}
          onChange={handleChange}
        />
      </FieldRow>
      <FieldRow>
        <FieldHint>
          {t('settings.options.verboseVideoCallLogging.description')}
        </FieldHint>
      </FieldRow>
    </Field>
  );
};
