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
import { SETTINGS_SET_VERBOSE_NOTIFICATIONS_LOGGING_CHANGED } from '../../../actions';

type VerboseNotificationsLoggingProps = {
  className?: string;
};

export const VerboseNotificationsLogging = (
  props: VerboseNotificationsLoggingProps
) => {
  const isVerboseNotificationsLoggingEnabled = useSelector(
    ({ isVerboseNotificationsLoggingEnabled }: RootState) =>
      isVerboseNotificationsLoggingEnabled
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.currentTarget.checked;
      dispatch({
        type: SETTINGS_SET_VERBOSE_NOTIFICATIONS_LOGGING_CHANGED,
        payload: isChecked,
      });
    },
    [dispatch]
  );

  const isVerboseNotificationsLoggingEnabledId = useId();

  return (
    <Field className={props.className}>
      <FieldRow>
        <FieldLabel htmlFor={isVerboseNotificationsLoggingEnabledId}>
          {t('settings.options.verboseNotificationsLogging.title')}
        </FieldLabel>
        <ToggleSwitch
          id={isVerboseNotificationsLoggingEnabledId}
          checked={isVerboseNotificationsLoggingEnabled}
          onChange={handleChange}
        />
      </FieldRow>
      <FieldRow>
        <FieldHint>
          {t('settings.options.verboseNotificationsLogging.description')}
        </FieldHint>
      </FieldRow>
    </Field>
  );
};
