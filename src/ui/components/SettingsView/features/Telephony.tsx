import type { ChangeEvent } from 'react';
import { useCallback, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { SETTINGS_SET_IS_TELEPHONY_ENABLED_CHANGED } from '../../../actions';
import { TelephonyDiagnostics } from './TelephonyDiagnostics';
import { ToggleField } from './ToggleField';

type TelephonyProps = {
  className?: string;
};

export const Telephony = (props: TelephonyProps) => {
  const isTelephonyEnabled = useSelector(
    ({ isTelephonyEnabled }: RootState) => isTelephonyEnabled
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.currentTarget.checked;
      dispatch({
        type: SETTINGS_SET_IS_TELEPHONY_ENABLED_CHANGED,
        payload: isChecked,
      });
    },
    [dispatch]
  );

  const isTelephonyEnabledId = useId();

  return (
    <ToggleField
      className={props.className}
      id={isTelephonyEnabledId}
      label={t('settings.options.telephony.title')}
      description={t('settings.options.telephony.description')}
      checked={isTelephonyEnabled}
      onChange={handleChange}
    >
      {isTelephonyEnabled && <TelephonyDiagnostics />}
    </ToggleField>
  );
};
