import {
  ToggleSwitch,
  Field,
  FieldRow,
  FieldLabel,
  FieldHint,
} from '@rocket.chat/fuselage';
import type { ChangeEvent, FC } from 'react';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { SETTINGS_SET_HARDWARE_ACCELERATION_OPT_IN_CHANGED } from '../../../actions';

type Props = {
  className?: string;
};

export const HardwareAcceleration: FC<Props> = (props) => {
  const isHardwareAccelerationEnabled = useSelector(
    ({ isHardwareAccelerationEnabled }: RootState) =>
      isHardwareAccelerationEnabled
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.currentTarget.checked;
      dispatch({
        type: SETTINGS_SET_HARDWARE_ACCELERATION_OPT_IN_CHANGED,
        payload: isChecked,
      });
    },
    [dispatch]
  );

  return (
    <Field className={props.className}>
      <FieldRow>
        <ToggleSwitch
          onChange={handleChange}
          checked={isHardwareAccelerationEnabled}
        />
        <FieldLabel htmlFor='toggle-switch'>
          {t('settings.options.hardwareAcceleration.title')}
        </FieldLabel>
      </FieldRow>
      <FieldRow>
        <FieldHint>
          {t('settings.options.hardwareAcceleration.description')}
        </FieldHint>
      </FieldRow>
    </Field>
  );
};
