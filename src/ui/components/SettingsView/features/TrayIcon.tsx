import type { ChangeEvent } from 'react';
import { useCallback, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { SETTINGS_SET_IS_TRAY_ICON_ENABLED_CHANGED } from '../../../actions';
import { ToggleField } from './ToggleField';

type TrayIconProps = {
  className?: string;
};

export const TrayIcon = (props: TrayIconProps) => {
  const isTrayIconEnabled = useSelector(
    ({ isTrayIconEnabled }: RootState) => isTrayIconEnabled
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.currentTarget.checked;
      dispatch({
        type: SETTINGS_SET_IS_TRAY_ICON_ENABLED_CHANGED,
        payload: isChecked,
      });
    },
    [dispatch]
  );

  const isTrayIconEnabledId = useId();

  return (
    <ToggleField
      id={isTrayIconEnabledId}
      label={
        process.platform === 'darwin'
          ? t('settings.options.trayIcon.titleDarwin')
          : t('settings.options.trayIcon.title')
      }
      description={
        process.platform === 'darwin'
          ? t('settings.options.trayIcon.descriptionDarwin')
          : t('settings.options.trayIcon.description')
      }
      checked={isTrayIconEnabled}
      onChange={handleChange}
      className={props.className}
    />
  );
};
