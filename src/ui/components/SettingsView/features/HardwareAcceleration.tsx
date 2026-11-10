import type { ChangeEvent } from 'react';
import { useCallback, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { SETTINGS_SET_HARDWARE_ACCELERATION_OPT_IN_CHANGED } from '../../../actions';
import { ToggleField } from './ToggleField';
import { useIsSettingOverridden } from './useIsSettingOverridden';

type HardwareAccelerationProps = {
  className?: string;
};

export const HardwareAcceleration = (props: HardwareAccelerationProps) => {
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

  const isOverridden = useIsSettingOverridden('isHardwareAccelerationEnabled');

  const isHardwareAccelerationEnabledId = useId();

  return (
    <ToggleField
      id={isHardwareAccelerationEnabledId}
      label={t('settings.options.hardwareAcceleration.title')}
      description={t('settings.options.hardwareAcceleration.description')}
      hint={
        isOverridden
          ? t('settings.overriddenByAdministrator')
          : t('settings.options.hardwareAcceleration.hint')
      }
      checked={isHardwareAccelerationEnabled}
      onChange={handleChange}
      disabled={isOverridden}
      className={props.className}
    />
  );
};
