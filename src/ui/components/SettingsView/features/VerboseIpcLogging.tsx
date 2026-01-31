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
import { SETTINGS_SET_VERBOSE_IPC_LOGGING_CHANGED } from '../../../actions';

type VerboseIpcLoggingProps = {
  className?: string;
};

export const VerboseIpcLogging = (props: VerboseIpcLoggingProps) => {
  const isVerboseIpcLoggingEnabled = useSelector(
    ({ isVerboseIpcLoggingEnabled }: RootState) => isVerboseIpcLoggingEnabled
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.currentTarget.checked;
      dispatch({
        type: SETTINGS_SET_VERBOSE_IPC_LOGGING_CHANGED,
        payload: isChecked,
      });
    },
    [dispatch]
  );

  const isVerboseIpcLoggingEnabledId = useId();

  return (
    <Field className={props.className}>
      <FieldRow>
        <FieldLabel htmlFor={isVerboseIpcLoggingEnabledId}>
          {t('settings.options.verboseIpcLogging.title')}
        </FieldLabel>
        <ToggleSwitch
          id={isVerboseIpcLoggingEnabledId}
          checked={isVerboseIpcLoggingEnabled}
          onChange={handleChange}
        />
      </FieldRow>
      <FieldRow>
        <FieldHint>
          {t('settings.options.verboseIpcLogging.description')}
        </FieldHint>
      </FieldRow>
    </Field>
  );
};
