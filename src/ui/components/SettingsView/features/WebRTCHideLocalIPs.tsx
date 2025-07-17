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
import { SETTINGS_SET_WEBRTC_HIDE_LOCAL_IPS_ENABLED_CHANGED } from '../../../actions';

type WebRTCHideLocalIPsProps = {
  className?: string;
};

export const WebRTCHideLocalIPs = (props: WebRTCHideLocalIPsProps) => {
  const isWebRTCHideLocalIPsEnabled = useSelector(
    ({ isWebRTCHideLocalIPsEnabled }: RootState) => isWebRTCHideLocalIPsEnabled
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.currentTarget.checked;
      dispatch({
        type: SETTINGS_SET_WEBRTC_HIDE_LOCAL_IPS_ENABLED_CHANGED,
        payload: isChecked,
      });
    },
    [dispatch]
  );

  const isWebRTCHideLocalIPsEnabledId = useId();

  return (
    <Field className={props.className}>
      <FieldRow>
        <FieldLabel htmlFor={isWebRTCHideLocalIPsEnabledId}>
          {t('settings.options.webrtcHideLocalIps.title')}
        </FieldLabel>
        <ToggleSwitch
          id={isWebRTCHideLocalIPsEnabledId}
          checked={isWebRTCHideLocalIPsEnabled}
          onChange={handleChange}
        />
      </FieldRow>
      <FieldRow>
        <FieldHint>
          {t('settings.options.webrtcHideLocalIps.description')}
        </FieldHint>
      </FieldRow>
    </Field>
  );
};
