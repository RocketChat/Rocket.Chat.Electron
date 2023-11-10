import {
  ToggleSwitch,
  Field,
  FieldRow,
  FieldLabel,
  FieldHint,
} from '@rocket.chat/fuselage';
import type { ChangeEvent, Dispatch, FC } from 'react';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { SETTINGS_SET_IS_TRAY_ICON_ENABLED_CHANGED } from '../../../actions';

type Props = {
  className?: string;
};

export const TrayIcon: FC<Props> = (props) => {
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

  return (
    <Field className={props.className}>
      <FieldRow>
        <ToggleSwitch onChange={handleChange} checked={isTrayIconEnabled} />
        <FieldLabel htmlFor='toggle-switch'>
          {t('settings.options.trayIcon.title')}
        </FieldLabel>
      </FieldRow>
      <FieldRow>
        <FieldHint>{t('settings.options.trayIcon.description')}</FieldHint>
      </FieldRow>
    </Field>
  );
};
