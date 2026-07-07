import { migrations } from '../PersistableValues';

describe('PersistableValues migrations', () => {
  it('adds telephony shortcut config without losing a persisted telephony server', () => {
    const before = {
      telephonyPreferredServer: 'https://chat.example.com',
    } as unknown as Parameters<(typeof migrations)['>=4.14.0']>[0];

    expect(migrations['>=4.14.0'](before)).toEqual({
      isTelephonyEnabled: false,
      telephonyPreferredServer: 'https://chat.example.com',
      telephonyGlobalShortcutConfig: {
        enabled: false,
        accelerator: null,
      },
    });
  });

  it('preserves a persisted navigationLayout value', () => {
    const before = {
      navigationLayout: 'sidebar',
    } as unknown as Parameters<(typeof migrations)['>=4.16.0']>[0];

    expect(migrations['>=4.16.0'](before)).toEqual(
      expect.objectContaining({ navigationLayout: 'sidebar' })
    );
  });

  it('defaults navigationLayout to tabs when absent', () => {
    const before = {} as unknown as Parameters<
      (typeof migrations)['>=4.16.0']
    >[0];

    expect(migrations['>=4.16.0'](before)).toEqual(
      expect.objectContaining({ navigationLayout: 'tabs' })
    );
  });
});
