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
import { SETTINGS_SET_IS_TELEPHONY_ENABLED_CHANGED } from '../../../actions';
import { TelephonyDiagnostics } from './TelephonyDiagnostics';

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
    <Field className={props.className} marginBlock='x16'>
      <FieldRow>
        <FieldLabel htmlFor={isTelephonyEnabledId}>
          {t('settings.options.telephony.title')}
        </FieldLabel>
        <ToggleSwitch
          id={isTelephonyEnabledId}
          checked={isTelephonyEnabled}
          onChange={handleChange}
        />
      </FieldRow>
      <FieldRow>
        <FieldHint>{t('settings.options.telephony.description')}</FieldHint>
      </FieldRow>
      {isTelephonyEnabled && <TelephonyDiagnostics />}
    </Field>
  );
};
