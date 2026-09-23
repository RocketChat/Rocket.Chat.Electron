import type { ChangeEvent } from 'react';
import { useCallback, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { SETTINGS_SET_IS_MENU_BAR_UNREAD_COUNT_ENABLED_CHANGED } from '../../../actions';
import { ToggleField } from './ToggleField';

type MenuBarUnreadCountProps = {
  className?: string;
};

export const MenuBarUnreadCount = (props: MenuBarUnreadCountProps) => {
  const isTrayIconEnabled = useSelector(
    ({ isTrayIconEnabled }: RootState) => isTrayIconEnabled
  );
  const isMenuBarUnreadCountEnabled = useSelector(
    ({ isMenuBarUnreadCountEnabled }: RootState) => isMenuBarUnreadCountEnabled
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      dispatch({
        type: SETTINGS_SET_IS_MENU_BAR_UNREAD_COUNT_ENABLED_CHANGED,
        payload: event.currentTarget.checked,
      });
    },
    [dispatch]
  );

  const id = useId();

  return (
    <ToggleField
      id={id}
      label={t('settings.options.menuBarUnreadCount.title')}
      description={t('settings.options.menuBarUnreadCount.description')}
      checked={isMenuBarUnreadCountEnabled}
      disabled={!isTrayIconEnabled}
      onChange={handleChange}
      className={props.className}
    />
  );
};
