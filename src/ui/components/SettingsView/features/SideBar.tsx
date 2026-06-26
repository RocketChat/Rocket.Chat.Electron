import type { ChangeEvent } from 'react';
import { useCallback, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { SETTINGS_SET_IS_SIDE_BAR_ENABLED_CHANGED } from '../../../actions';
import { ToggleField } from './ToggleField';

type SideBarProps = {
  className?: string;
};

export const SideBar = (props: SideBarProps) => {
  const isSideBarEnabled = useSelector(
    ({ isSideBarEnabled }: RootState) => isSideBarEnabled
  );
  const isMenuBarEnabled = useSelector(
    ({ isMenuBarEnabled }: RootState) => isMenuBarEnabled
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.currentTarget.checked;
      dispatch({
        type: SETTINGS_SET_IS_SIDE_BAR_ENABLED_CHANGED,
        payload: isChecked,
      });
    },
    [dispatch]
  );

  const isSideBarEnabledId = useId();
  const canToggle = !isSideBarEnabled || isMenuBarEnabled;

  return (
    <ToggleField
      id={isSideBarEnabledId}
      label={t('settings.options.sidebar.title')}
      description={
        !isMenuBarEnabled && isSideBarEnabled
          ? t('settings.options.sidebar.disabledHint')
          : t('settings.options.sidebar.description')
      }
      checked={isSideBarEnabled}
      onChange={handleChange}
      disabled={!canToggle}
      className={props.className}
    />
  );
};
