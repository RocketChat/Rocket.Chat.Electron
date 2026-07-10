import {
  APP_SETTINGS_LOADED,
  APP_ALLOWED_NTLM_CREDENTIALS_DOMAINS_SET,
} from '../../actions';
import { allowedNTLMCredentialsDomains } from '../allowedNTLMCredentialsDomains';

describe('allowedNTLMCredentialsDomains reducer', () => {
  const unknownAction = { type: 'UNKNOWN_ACTION', payload: undefined } as any;

  it('should default to null', () => {
    expect(allowedNTLMCredentialsDomains(undefined, unknownAction)).toBeNull();
  });

  it('should read value from APP_SETTINGS_LOADED', () => {
    expect(
      allowedNTLMCredentialsDomains(null, {
        type: APP_SETTINGS_LOADED,
        payload: { allowedNTLMCredentialsDomains: 'example.com' },
      } as any)
    ).toBe('example.com');
  });

  it('should fall back to existing state when APP_SETTINGS_LOADED payload is missing', () => {
    expect(
      allowedNTLMCredentialsDomains('existing-value', {
        type: APP_SETTINGS_LOADED,
        payload: {},
      } as any)
    ).toBe('existing-value');
  });

  it('should set the domain when APP_ALLOWED_NTLM_CREDENTIALS_DOMAINS_SET is dispatched', () => {
    expect(
      allowedNTLMCredentialsDomains(null, {
        type: APP_ALLOWED_NTLM_CREDENTIALS_DOMAINS_SET,
        payload: 'new-domain.com',
      } as any)
    ).toBe('new-domain.com');
  });

  it('should clear state when APP_ALLOWED_NTLM_CREDENTIALS_DOMAINS_SET is null', () => {
    expect(
      allowedNTLMCredentialsDomains('existing-value', {
        type: APP_ALLOWED_NTLM_CREDENTIALS_DOMAINS_SET,
        payload: null,
      } as any)
    ).toBeNull();
  });
});
