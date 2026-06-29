import type { Certificate } from 'electron';

import { APP_SETTINGS_LOADED } from '../../../app/actions';
import {
  CERTIFICATES_CLIENT_CERTIFICATE_REQUESTED,
  SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED,
  SELECT_CLIENT_CERTIFICATE_DIALOG_DISMISSED,
  TRUSTED_CERTIFICATES_UPDATED,
  NOT_TRUSTED_CERTIFICATES_UPDATED,
  CERTIFICATES_CLEARED,
  CERTIFICATES_LOADED,
  EXTERNAL_PROTOCOL_PERMISSION_UPDATED,
} from '../../actions';
import {
  clientCertificates,
  trustedCertificates,
  notTrustedCertificates,
  externalProtocols,
} from '../../reducers';

const unknown = { type: 'UNKNOWN_ACTION' } as any;

describe('clientCertificates reducer', () => {
  it('should default to empty array', () => {
    expect(clientCertificates(undefined, unknown)).toEqual([]);
  });

  it('should set certificates on CERTIFICATES_CLIENT_CERTIFICATE_REQUESTED', () => {
    const certs = [{ fingerprint: 'a' }] as unknown as Certificate[];
    expect(
      clientCertificates([], {
        type: CERTIFICATES_CLIENT_CERTIFICATE_REQUESTED,
        payload: certs,
      } as any)
    ).toBe(certs);
  });

  it('should clear on SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED', () => {
    const certs = [{ fingerprint: 'a' }] as unknown as Certificate[];
    expect(
      clientCertificates(certs, {
        type: SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED,
        payload: 'a',
      } as any)
    ).toEqual([]);
  });

  it('should clear on SELECT_CLIENT_CERTIFICATE_DIALOG_DISMISSED', () => {
    const certs = [{ fingerprint: 'a' }] as unknown as Certificate[];
    expect(
      clientCertificates(certs, {
        type: SELECT_CLIENT_CERTIFICATE_DIALOG_DISMISSED,
      } as any)
    ).toEqual([]);
  });

  it('should preserve state on unknown action', () => {
    const certs = [{ fingerprint: 'a' }] as unknown as Certificate[];
    expect(clientCertificates(certs, unknown)).toBe(certs);
  });
});

describe('trustedCertificates reducer', () => {
  it('should default to empty object', () => {
    expect(trustedCertificates(undefined, unknown)).toEqual({});
  });

  it('should set payload on CERTIFICATES_LOADED', () => {
    const payload = { 'https://a/': 'fp' };
    expect(
      trustedCertificates({}, { type: CERTIFICATES_LOADED, payload } as any)
    ).toBe(payload);
  });

  it('should set payload on TRUSTED_CERTIFICATES_UPDATED', () => {
    const payload = { 'https://a/': 'fp' };
    expect(
      trustedCertificates({}, {
        type: TRUSTED_CERTIFICATES_UPDATED,
        payload,
      } as any)
    ).toBe(payload);
  });

  it('should clear on CERTIFICATES_CLEARED', () => {
    expect(
      trustedCertificates({ 'https://a/': 'fp' }, {
        type: CERTIFICATES_CLEARED,
      } as any)
    ).toEqual({});
  });

  it('should read value from APP_SETTINGS_LOADED', () => {
    const trusted = { 'https://a/': 'fp' };
    expect(
      trustedCertificates({}, {
        type: APP_SETTINGS_LOADED,
        payload: { trustedCertificates: trusted },
      } as any)
    ).toBe(trusted);
  });

  it('should fall back to current state when missing in APP_SETTINGS_LOADED', () => {
    const state = { 'https://a/': 'fp' };
    expect(
      trustedCertificates(state, {
        type: APP_SETTINGS_LOADED,
        payload: {},
      } as any)
    ).toBe(state);
  });

  it('should preserve state on unknown action', () => {
    const state = { 'https://a/': 'fp' };
    expect(trustedCertificates(state, unknown)).toBe(state);
  });
});

describe('notTrustedCertificates reducer', () => {
  it('should default to empty object', () => {
    expect(notTrustedCertificates(undefined, unknown)).toEqual({});
  });

  it('should set payload on NOT_TRUSTED_CERTIFICATES_UPDATED', () => {
    const payload = { 'https://a/': 'fp' };
    expect(
      notTrustedCertificates({}, {
        type: NOT_TRUSTED_CERTIFICATES_UPDATED,
        payload,
      } as any)
    ).toBe(payload);
  });

  it('should clear on CERTIFICATES_CLEARED', () => {
    expect(
      notTrustedCertificates({ 'https://a/': 'fp' }, {
        type: CERTIFICATES_CLEARED,
      } as any)
    ).toEqual({});
  });

  it('should read value from APP_SETTINGS_LOADED', () => {
    const notTrusted = { 'https://a/': 'fp' };
    expect(
      notTrustedCertificates({}, {
        type: APP_SETTINGS_LOADED,
        payload: { notTrustedCertificates: notTrusted },
      } as any)
    ).toBe(notTrusted);
  });

  it('should fall back to current state when missing in APP_SETTINGS_LOADED', () => {
    const state = { 'https://a/': 'fp' };
    expect(
      notTrustedCertificates(state, {
        type: APP_SETTINGS_LOADED,
        payload: {},
      } as any)
    ).toBe(state);
  });

  it('should preserve state on unknown action', () => {
    const state = { 'https://a/': 'fp' };
    expect(notTrustedCertificates(state, unknown)).toBe(state);
  });
});

describe('externalProtocols reducer', () => {
  it('should default to empty object', () => {
    expect(externalProtocols(undefined, unknown)).toEqual({});
  });

  it('should read value from APP_SETTINGS_LOADED', () => {
    const protocols = { 'tel:': true };
    expect(
      externalProtocols({}, {
        type: APP_SETTINGS_LOADED,
        payload: { externalProtocols: protocols },
      } as any)
    ).toBe(protocols);
  });

  it('should default to empty object when missing in APP_SETTINGS_LOADED', () => {
    expect(
      externalProtocols({ 'tel:': true }, {
        type: APP_SETTINGS_LOADED,
        payload: {},
      } as any)
    ).toEqual({});
  });

  it('should set a protocol permission on EXTERNAL_PROTOCOL_PERMISSION_UPDATED', () => {
    const newState = externalProtocols({ 'tel:': true }, {
      type: EXTERNAL_PROTOCOL_PERMISSION_UPDATED,
      payload: { protocol: 'mailto:', allowed: true },
    } as any);

    expect(newState).toEqual({ 'tel:': true, 'mailto:': true });
  });

  it('should not mutate the original state on EXTERNAL_PROTOCOL_PERMISSION_UPDATED', () => {
    const state = { 'tel:': true };
    const newState = externalProtocols(state, {
      type: EXTERNAL_PROTOCOL_PERMISSION_UPDATED,
      payload: { protocol: 'mailto:', allowed: false },
    } as any);

    expect(newState).not.toBe(state);
    expect(state).toEqual({ 'tel:': true });
  });

  it('should preserve state on unknown action', () => {
    const state = { 'tel:': true };
    expect(externalProtocols(state, unknown)).toBe(state);
  });
});
