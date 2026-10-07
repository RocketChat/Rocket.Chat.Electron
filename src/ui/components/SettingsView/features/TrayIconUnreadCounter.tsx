import type { ChangeEvent } from 'react';
import { useCallback, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { SETTINGS_SET_IS_TRAY_ICON_UNREAD_COUNTER_ENABLED_CHANGED } from '../../../actions';
import { ToggleField } from './ToggleField';

type TrayIconUnreadCounterProps = {
  className?: string;
};

export const TrayIconUnreadCounter = (props: TrayIconUnreadCounterProps) => {
  const isTrayIconEnabled = useSelector(
    ({ isTrayIconEnabled }: RootState) => isTrayIconEnabled
  );
  const isTrayIconUnreadCounterEnabled = useSelector(
    ({ isTrayIconUnreadCounterEnabled }: RootState) =>
      isTrayIconUnreadCounterEnabled
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      dispatch({
        type: SETTINGS_SET_IS_TRAY_ICON_UNREAD_COUNTER_ENABLED_CHANGED,
        payload: event.currentTarget.checked,
      });
    },
    [dispatch]
  );

  const id = useId();

  return (
    <ToggleField
      id={id}
      label={
        process.platform === 'darwin'
          ? t('settings.options.trayIconUnreadCounter.titleDarwin')
          : t('settings.options.trayIconUnreadCounter.title')
      }
      description={t('settings.options.trayIconUnreadCounter.description')}
      checked={isTrayIconUnreadCounterEnabled}
      disabled={!isTrayIconEnabled}
      onChange={handleChange}
      className={props.className}
    />
  );
};
