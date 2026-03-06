import {
  Box,
  Field,
  FieldHint,
  FieldLabel,
  InputBox,
} from '@rocket.chat/fuselage';
import type { ChangeEvent } from 'react';
import { useCallback, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { SETTINGS_SET_OUTLOOK_CALENDAR_SYNC_INTERVAL_CHANGED } from '../../../actions';

export const OutlookCalendarSyncInterval = () => {
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
    <Field marginBlock='x16'>
      <Box
        display='flex'
        flexDirection='row'
        justifyContent='space-between'
        alignItems='flex-start'
      >
        <Box display='flex' flexDirection='column'>
          <FieldLabel htmlFor={fieldId}>
            {t('settings.options.outlookCalendarSyncInterval.title')}
          </FieldLabel>
          <FieldHint>
            {t('settings.options.outlookCalendarSyncInterval.description')}
          </FieldHint>
        </Box>
        <Box display='flex' alignItems='center' style={{ paddingTop: '4px' }}>
          <InputBox
            id={fieldId}
            type='number'
            min={1}
            max={60}
            value={intervalMinutes}
            onChange={handleChange}
            style={{ maxWidth: '5rem' }}
          />
        </Box>
      </Box>
    </Field>
  );
};
