import { Select } from '@rocket.chat/fuselage';
import { useCallback, useId, useMemo } from 'react';
import type { Key } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { TELEPHONY_PREFERRED_SERVER_SET } from '../../../../telephony/actions';
import { SettingField } from './SettingField';

const safeHostname = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

type TelephonyServerProps = {
  className?: string;
};

export const TelephonyServer = (props: TelephonyServerProps) => {
  const servers = useSelector(({ servers }: RootState) => servers);
  const telephonyPreferredServer = useSelector(
    ({ telephonyPreferredServer }: RootState) => telephonyPreferredServer
  );
  const isTelephonyEnabled = useSelector(
    ({ isTelephonyEnabled }: RootState) => isTelephonyEnabled
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();
  const telephonyServerSelectId = useId();

  const handleChange = useCallback(
    (value: Key) => {
      const stringValue = String(value);
      dispatch({
        type: TELEPHONY_PREFERRED_SERVER_SET,
        payload: stringValue === 'auto' ? null : stringValue,
      });
    },
    [dispatch]
  );

  const options = useMemo(
    (): [string, string][] => [
      ['auto', t('settings.options.telephonyServer.auto')],
      ...servers.map((s): [string, string] => [
        s.url,
        s.title ?? safeHostname(s.url),
      ]),
    ],
    [servers, t]
  );

  if (servers.length <= 1) {
    return null;
  }

  return (
    <SettingField
      className={props.className}
      htmlFor={telephonyServerSelectId}
      label={t('settings.options.telephonyServer.title')}
      description={t('settings.options.telephonyServer.description')}
    >
      <Select
        id={telephonyServerSelectId}
        disabled={!isTelephonyEnabled}
        options={options}
        value={telephonyPreferredServer ?? 'auto'}
        onChange={handleChange}
      />
    </SettingField>
  );
};
