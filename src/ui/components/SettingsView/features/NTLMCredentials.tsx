import { FieldHint, FieldRow, InputBox } from '@rocket.chat/fuselage';
import type { FocusEvent } from 'react';
import { useCallback, type ChangeEvent, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import { APP_ALLOWED_NTLM_CREDENTIALS_DOMAINS_SET } from '../../../../app/actions';
import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { SETTINGS_NTLM_CREDENTIALS_CHANGED } from '../../../actions';
import { ToggleField } from './ToggleField';

type NTLMCredentialsProps = {
  className?: string;
};

export const NTLMCredentials = (props: NTLMCredentialsProps) => {
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
    (event: FocusEvent<HTMLInputElement>) => {
      const domains = event.target.value;
      dispatch({
        type: APP_ALLOWED_NTLM_CREDENTIALS_DOMAINS_SET,
        payload: domains,
      });
    },
    [dispatch]
  );

  const isNTLMCredentialsEnabledId = useId();

  return (
    <ToggleField
      id={isNTLMCredentialsEnabledId}
      label={t('settings.options.ntlmCredentials.title')}
      description={t('settings.options.ntlmCredentials.description')}
      checked={isNTLMCredentialsEnabled}
      onChange={handleToggleChange}
      className={props.className}
    >
      <FieldRow>
        <FieldRow size='100%'>
          <InputBox
            defaultValue={allowedNTLMCredentialsDomains as string}
            onBlur={handleDomainsChange}
            type='text'
            disabled={!isNTLMCredentialsEnabled}
            placeholder='*example.com, *foobar.com, *baz'
          />
        </FieldRow>
      </FieldRow>
      <FieldHint>{t('settings.options.ntlmCredentials.domains')}</FieldHint>
    </ToggleField>
  );
};
