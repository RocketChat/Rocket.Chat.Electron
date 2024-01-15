import {
  ToggleSwitch,
  Field,
  FieldRow,
  FieldLabel,
  FieldHint,
} from '@rocket.chat/fuselage';
import type { ChangeEvent } from 'react';
import { useCallback, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { SETTINGS_SET_IS_TRAY_ICON_ENABLED_CHANGED } from '../../../actions';

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
    <Field className={props.className}>
      <FieldRow>
        <FieldLabel htmlFor={isTrayIconEnabledId}>
          {t('settings.options.trayIcon.title')}
        </FieldLabel>
        <ToggleSwitch
          id={isTrayIconEnabledId}
          checked={isTrayIconEnabled}
          onChange={handleChange}
        />
      </FieldRow>
      <FieldRow>
        <FieldHint>{t('settings.options.trayIcon.description')}</FieldHint>
      </FieldRow>
    </Field>
  );
};
