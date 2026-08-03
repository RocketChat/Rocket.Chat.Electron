import type { ChangeEvent } from 'react';
import { useCallback, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { SETTINGS_SET_IS_TRANSPARENT_WINDOW_ENABLED_CHANGED } from '../../../actions';
import { ToggleField } from './ToggleField';

type TransparentWindowProps = {
  className?: string;
};

export const TransparentWindow = (props: TransparentWindowProps) => {
  const isTransparentWindowEnabled = useSelector(
    ({ isTransparentWindowEnabled }: RootState) => isTransparentWindowEnabled
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.currentTarget.checked;
      dispatch({
        type: SETTINGS_SET_IS_TRANSPARENT_WINDOW_ENABLED_CHANGED,
        payload: isChecked,
      });
    },
    [dispatch]
  );

  const id = useId();

  return (
    <ToggleField
      id={id}
      label={t('settings.options.transparentWindow.title')}
      description={t('settings.options.transparentWindow.description')}
      checked={isTransparentWindowEnabled}
      onChange={handleChange}
      className={props.className}
    />
  );
};
