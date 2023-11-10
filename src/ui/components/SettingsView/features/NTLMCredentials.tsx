import {
  Field,
  FieldHint,
  FieldLabel,
  FieldRow,
  InputBox,
  ToggleSwitch,
} from '@rocket.chat/fuselage';
import React, {
  useCallback,
  type ChangeEvent,
  type Dispatch,
  type FC,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import { APP_ALLOWED_NTLM_CREDENTIALS_DOMAINS_SET } from '../../../../app/actions';
import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { SETTINGS_NTLM_CREDENTIALS_CHANGED } from '../../../actions';

type Props = {
  className?: string;
};

export const NTLMCredentials: FC<Props> = (props) => {
  const isNTLMCredentialsEnabled = useSelector(
    ({ isNTLMCredentialsEnabled }: RootState) => isNTLMCredentialsEnabled
  );
  const allowedNTLMCredentialsDomains = useSelector(
    ({ allowedNTLMCredentialsDomains }: RootState) =>
      allowedNTLMCredentialsDomains
  );
  const { t } = useTranslation();
  const dispatch = useDispatch<Dispatch<RootAction>>();

  const handleToggleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.currentTarget.checked;
      dispatch({
        type: SETTINGS_NTLM_CREDENTIALS_CHANGED,
        payload: isChecked,
      });
    },
    [dispatch]
  );

  const handleDomainsChange = useCallback(
    (event: React.FocusEvent<HTMLInputElement>) => {
      const domains = event.target.value;
      dispatch({
        type: APP_ALLOWED_NTLM_CREDENTIALS_DOMAINS_SET,
        payload: domains,
      });
    },
    [dispatch]
  );

  return (
    <Field className={props.className}>
      <FieldRow>
        <ToggleSwitch
          onChange={handleToggleChange}
          checked={isNTLMCredentialsEnabled}
        />
        <FieldLabel htmlFor='toggle-switch'>
          {t('settings.options.ntlmCredentials.title')}
        </FieldLabel>
      </FieldRow>
      <FieldRow>
        <FieldHint>
          {t('settings.options.ntlmCredentials.description')}
        </FieldHint>
      </FieldRow>
      <FieldRow>
        <FieldRow size={'100%'}>
          <InputBox
            defaultValue={allowedNTLMCredentialsDomains as string}
            onBlur={handleDomainsChange}
            type={'text'}
            disabled={!isNTLMCredentialsEnabled}
            placeholder='*example.com, *foobar.com, *baz'
          />
        </FieldRow>
      </FieldRow>
      <FieldRow>
        <FieldHint>{t('settings.options.ntlmCredentials.domains')}</FieldHint>
      </FieldRow>
    </Field>
  );
};
