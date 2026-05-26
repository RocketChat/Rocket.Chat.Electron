import {
  Box,
  Field,
  FieldLabel,
  FieldHint,
  Select,
} from '@rocket.chat/fuselage';
import { useCallback, useMemo } from 'react';
import type { Key } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { TELEPHONY_PREFERRED_SERVER_SET } from '../../../../telephony/actions';

export const TelephonyServer = () => {
  const servers = useSelector(({ servers }: RootState) => servers);
  const telephonyPreferredServer = useSelector(
    ({ telephonyPreferredServer }: RootState) => telephonyPreferredServer
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();

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
        s.title ?? new URL(s.url).hostname,
      ]),
    ],
    [servers, t]
  );

  if (servers.length <= 1) {
    return null;
  }

  return (
    <Field>
      <Box
        display='flex'
        flexDirection='row'
        justifyContent='space-between'
        alignItems='flex-start'
      >
        <Box display='flex' flexDirection='column'>
          <FieldLabel>{t('settings.options.telephonyServer.title')}</FieldLabel>
          <FieldHint>
            {t('settings.options.telephonyServer.description')}
          </FieldHint>
        </Box>
        <Box display='flex' alignItems='center' paddingBlockStart='x4'>
          <Select
            options={options}
            value={telephonyPreferredServer ?? 'auto'}
            onChange={handleChange}
            width={220}
          />
        </Box>
      </Box>
    </Field>
  );
};
