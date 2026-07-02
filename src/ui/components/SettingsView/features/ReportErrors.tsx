import type { ChangeEvent } from 'react';
import { useCallback, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { SETTINGS_SET_REPORT_OPT_IN_CHANGED } from '../../../actions';
import { ToggleField } from './ToggleField';

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
    <ToggleField
      id={isReportEnabledId}
      label={t('settings.options.report.title')}
      description={
        process.mas
          ? t('settings.options.report.masDescription')
          : t('settings.options.report.description')
      }
      checked={isReportEnabled}
      onChange={handleChange}
      disabled={process.mas}
      className={props.className}
    />
  );
};
