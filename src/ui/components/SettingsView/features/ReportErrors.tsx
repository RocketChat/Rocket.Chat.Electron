import { ToggleSwitch, Field } from '@rocket.chat/fuselage';
import React, { ChangeEvent, Dispatch, FC, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import { RootAction } from '../../../../store/actions';
import { RootState } from '../../../../store/rootReducer';
import { SETTINGS_SET_REPORT_OPT_IN_CHANGED } from '../../../actions';

type Props = {
  className?: string;
};

export const ReportErrors: FC<Props> = (props) => {
  const isReportEnabled = useSelector(
    ({ isReportEnabled }: RootState) => isReportEnabled
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.currentTarget.checked;
      dispatch({
        type: SETTINGS_SET_REPORT_OPT_IN_CHANGED,
        payload: isChecked,
      });
    },
    [dispatch]
  );

  return (
    <Field className={props.className}>
      <Field.Row>
        <ToggleSwitch
          disabled={process.mas}
          onChange={handleChange}
          checked={isReportEnabled}
        />
        <Field.Label htmlFor='toggle-switch'>
          {t('settings.options.report.title')}
        </Field.Label>
      </Field.Row>
      <Field.Row>
        {process.mas ? (
          <Field.Hint>{t('settings.options.report.masDescription')}</Field.Hint>
        ) : (
          <Field.Hint>{t('settings.options.report.description')}</Field.Hint>
        )}
      </Field.Row>
    </Field>
  );
};
