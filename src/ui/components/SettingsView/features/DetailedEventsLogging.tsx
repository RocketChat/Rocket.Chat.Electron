import type { ChangeEvent } from 'react';
import { useCallback, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { SETTINGS_SET_DETAILED_EVENTS_LOGGING_CHANGED } from '../../../actions';
import { ToggleField } from './ToggleField';

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
    <ToggleField
      className={props.className}
      id={isDetailedEventsLoggingEnabledId}
      label={t('settings.options.detailedEventsLogging.title')}
      description={t('settings.options.detailedEventsLogging.description')}
      checked={isDetailedEventsLoggingEnabled}
      onChange={handleChange}
    />
  );
};
