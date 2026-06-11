import { InputBox } from '@rocket.chat/fuselage';
import type { ChangeEvent } from 'react';
import { useCallback, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { SETTINGS_SET_OUTLOOK_CALENDAR_SYNC_INTERVAL_CHANGED } from '../../../actions';
import { SettingField } from './SettingField';

type OutlookCalendarSyncIntervalProps = {
  className?: string;
};

export const OutlookCalendarSyncInterval = (
  props: OutlookCalendarSyncIntervalProps
) => {
  const isOverridden = useSelector(
    ({ outlookCalendarSyncIntervalOverride }: RootState) =>
      outlookCalendarSyncIntervalOverride !== null
  );
  const intervalMinutes = useSelector(
    ({ outlookCalendarSyncInterval }: RootState) => outlookCalendarSyncInterval
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const raw = parseInt(event.currentTarget.value, 10);
      if (Number.isNaN(raw)) return;
      const clamped = Math.max(1, Math.min(60, raw));
      dispatch({
        type: SETTINGS_SET_OUTLOOK_CALENDAR_SYNC_INTERVAL_CHANGED,
        payload: clamped,
      });
    },
    [dispatch]
  );

  const fieldId = useId();

  if (isOverridden) return null;

  return (
    <SettingField
      className={props.className}
      htmlFor={fieldId}
      label={t('settings.options.outlookCalendarSyncInterval.title')}
      hint={t('settings.options.outlookCalendarSyncInterval.description')}
    >
      <InputBox
        id={fieldId}
        type='number'
        min={1}
        max={60}
        value={intervalMinutes}
        onChange={handleChange}
        maxWidth='x80'
      />
    </SettingField>
  );
};
