import type { ChangeEvent } from 'react';
import { useCallback, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { SETTINGS_SET_MINIMIZE_ON_CLOSE_OPT_IN_CHANGED } from '../../../actions';
import { ToggleField } from './ToggleField';

type MinimizeOnCloseProps = {
  className?: string;
};

export const MinimizeOnClose = (props: MinimizeOnCloseProps) => {
  const isMinimizeOnCloseEnabled = useSelector(
    ({ isMinimizeOnCloseEnabled }: RootState) => isMinimizeOnCloseEnabled
  );
  const isTrayIconEnabled = useSelector(
    ({ isTrayIconEnabled }: RootState) => isTrayIconEnabled
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.currentTarget.checked;
      dispatch({
        type: SETTINGS_SET_MINIMIZE_ON_CLOSE_OPT_IN_CHANGED,
        payload: isChecked,
      });
    },
    [dispatch]
  );

  const isMinimizeOnCloseEnabledId = useId();

  return (
    <ToggleField
      id={isMinimizeOnCloseEnabledId}
      label={t('settings.options.minimizeOnClose.title')}
      description={t('settings.options.minimizeOnClose.description')}
      hint={
        isTrayIconEnabled
          ? t('settings.options.minimizeOnClose.disabledHint')
          : undefined
      }
      checked={isMinimizeOnCloseEnabled}
      onChange={handleChange}
      disabled={isTrayIconEnabled}
      className={props.className}
    />
  );
};
