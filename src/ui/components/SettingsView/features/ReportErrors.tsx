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
import { SETTINGS_SET_REPORT_OPT_IN_CHANGED } from '../../../actions';

type ReportErrorsProps = {
  className?: string;
};

export const ReportErrors = (props: ReportErrorsProps) => {
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

  const isReportEnabledId = useId();

  return (
    <Field className={props.className}>
      <FieldRow>
        <FieldLabel htmlFor={isReportEnabledId}>
          {t('settings.options.report.title')}
        </FieldLabel>
        <ToggleSwitch
          id={isReportEnabledId}
          disabled={process.mas}
          checked={isReportEnabled}
          onChange={handleChange}
        />
      </FieldRow>
      <FieldRow>
        {process.mas ? (
          <FieldHint>{t('settings.options.report.masDescription')}</FieldHint>
        ) : (
          <FieldHint>{t('settings.options.report.description')}</FieldHint>
        )}
      </FieldRow>
    </Field>
  );
};
