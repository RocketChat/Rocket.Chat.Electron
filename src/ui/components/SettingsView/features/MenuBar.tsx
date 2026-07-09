import type { ChangeEvent } from 'react';
import { useCallback, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { SETTINGS_SET_IS_MENU_BAR_ENABLED_CHANGED } from '../../../actions';
import { ToggleField } from './ToggleField';

type MenuBarProps = {
  className?: string;
};

export const MenuBar = (props: MenuBarProps) => {
  const isMenuBarEnabled = useSelector(
    ({ isMenuBarEnabled }: RootState) => isMenuBarEnabled
  );
  const navigationLayout = useSelector(
    ({ navigationLayout }: RootState) => navigationLayout
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.currentTarget.checked;
      dispatch({
        type: SETTINGS_SET_IS_MENU_BAR_ENABLED_CHANGED,
        payload: isChecked,
      });
    },
    [dispatch]
  );

  const isMenuBarEnabledId = useId();
  const canToggle = !isMenuBarEnabled || navigationLayout === 'sidebar';

  return (
    <ToggleField
      id={isMenuBarEnabledId}
      label={t('settings.options.menubar.title')}
      description={
        navigationLayout !== 'sidebar' && isMenuBarEnabled
          ? t('settings.options.menubar.disabledHint')
          : t('settings.options.menubar.description')
      }
      checked={isMenuBarEnabled}
      onChange={handleChange}
      disabled={!canToggle}
      className={props.className}
    />
  );
};
