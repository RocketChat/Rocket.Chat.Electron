import type { ChangeEvent } from 'react';
import { useCallback, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { SETTINGS_SET_VERBOSE_OUTLOOK_LOGGING_CHANGED } from '../../../actions';
import { ToggleField } from './ToggleField';

type VerboseOutlookLoggingProps = {
  className?: string;
};

export const VerboseOutlookLogging = (props: VerboseOutlookLoggingProps) => {
  const isVerboseOutlookLoggingEnabled = useSelector(
    ({ isVerboseOutlookLoggingEnabled }: RootState) =>
      isVerboseOutlookLoggingEnabled
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.currentTarget.checked;
      dispatch({
        type: SETTINGS_SET_VERBOSE_OUTLOOK_LOGGING_CHANGED,
        payload: isChecked,
      });
    },
    [dispatch]
  );

  const isVerboseOutlookLoggingEnabledId = useId();

  return (
    <ToggleField
      className={props.className}
      id={isVerboseOutlookLoggingEnabledId}
      label={t('settings.options.verboseOutlookLogging.title')}
      description={t('settings.options.verboseOutlookLogging.description')}
      checked={isVerboseOutlookLoggingEnabled}
      onChange={handleChange}
    />
  );
};
