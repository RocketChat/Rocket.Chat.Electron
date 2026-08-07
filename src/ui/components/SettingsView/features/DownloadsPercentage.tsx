import type { ChangeEvent } from 'react';
import { useCallback, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { SETTINGS_SET_DOWNLOADS_PERCENTAGE_ENABLED_CHANGED } from '../../../actions';
import { ToggleField } from './ToggleField';

type DownloadsPercentageProps = {
  className?: string;
};

export const DownloadsPercentage = (props: DownloadsPercentageProps) => {
  const isDownloadsPercentageEnabled = useSelector(
    ({ isDownloadsPercentageEnabled }: RootState) =>
      isDownloadsPercentageEnabled
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.currentTarget.checked;
      dispatch({
        type: SETTINGS_SET_DOWNLOADS_PERCENTAGE_ENABLED_CHANGED,
        payload: isChecked,
      });
    },
    [dispatch]
  );

  const isDownloadsPercentageEnabledId = useId();

  return (
    <ToggleField
      id={isDownloadsPercentageEnabledId}
      label={t('settings.options.downloadsPercentage.title')}
      description={t('settings.options.downloadsPercentage.description')}
      checked={isDownloadsPercentageEnabled}
      onChange={handleChange}
      className={props.className}
    />
  );
};
