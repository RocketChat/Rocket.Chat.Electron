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
import { SETTINGS_SET_DETAILED_EVENTS_LOGGING_CHANGED } from '../../../actions';

type DetailedEventsLoggingProps = {
  className?: string;
};

export const DetailedEventsLogging = (props: DetailedEventsLoggingProps) => {
  const isDetailedEventsLoggingEnabled = useSelector(
    ({ isDetailedEventsLoggingEnabled }: RootState) =>
      isDetailedEventsLoggingEnabled
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.currentTarget.checked;
      dispatch({
        type: SETTINGS_SET_DETAILED_EVENTS_LOGGING_CHANGED,
        payload: isChecked,
      });
    },
    [dispatch]
  );

  const isDetailedEventsLoggingEnabledId = useId();

  return (
    <Field className={props.className}>
      <FieldRow>
        <FieldLabel htmlFor={isDetailedEventsLoggingEnabledId}>
          {t('settings.options.detailedEventsLogging.title')}
        </FieldLabel>
        <ToggleSwitch
          id={isDetailedEventsLoggingEnabledId}
          checked={isDetailedEventsLoggingEnabled}
          onChange={handleChange}
        />
      </FieldRow>
      <FieldRow>
        <FieldHint>
          {t('settings.options.detailedEventsLogging.description')}
        </FieldHint>
      </FieldRow>
    </Field>
  );
};
