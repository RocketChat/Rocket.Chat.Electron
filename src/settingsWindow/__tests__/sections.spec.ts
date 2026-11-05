import { getSearchableSettingKeys } from '../searchIndex';
import { SETTINGS_SECTIONS } from '../sections';
import type { SettingAvailabilityContext } from '../sections';

describe('SETTINGS_SECTIONS', () => {
  it('has unique ids', () => {
    const ids = SETTINGS_SECTIONS.map((section) => section.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every section a component and a label key', () => {
    SETTINGS_SECTIONS.forEach((section) => {
      expect(typeof section.Component).toBe('function');
      expect(section.labelKey).toMatch(/^settings\./);
    });
  });

  it('indexes every section for search', () => {
    SETTINGS_SECTIONS.forEach((section) => {
      expect(section.settingKeys.length).toBeGreaterThan(0);
      // Keys are i18n namespaces; they do not all live under `settings.` —
      // certificates index the `certificatesManager` tree.
      section.settingKeys.forEach((key) =>
        expect(key).toMatch(/^[a-z][\w.]*[^.]$/i)
      );
    });
  });

  it('separates telephony from video calls', () => {
    const ids = SETTINGS_SECTIONS.map((section) => section.id);
    expect(ids).toContain('telephony');
    expect(ids).toContain('videoCalls');
  });

  it('lists every section, gating developer content inside Advanced instead', () => {
    const ids = SETTINGS_SECTIONS.map((section) => section.id);
    expect(ids).toContain('advanced');
    expect(ids).not.toContain('developer');
  });

  it('does not list the same setting in two sections', () => {
    const keys = SETTINGS_SECTIONS.flatMap((section) => section.settingKeys);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('settings search availability (CORE-2782)', () => {
  const context = (
    overrides: Partial<SettingAvailabilityContext> = {}
  ): SettingAvailabilityContext => ({
    isDeveloperModeEnabled: false,
    canUpdate: true,
    isStoreUpdate: false,
    platform: 'darwin',
    serverCount: 2,
    isOutlookCalendarSyncIntervalOverridden: false,
    ...overrides,
  });

  const searchableKeys = (ctx: SettingAvailabilityContext): string[] =>
    SETTINGS_SECTIONS.flatMap((section) =>
      getSearchableSettingKeys(section, ctx)
    );

  const DEVELOPER_ONLY_KEYS = [
    'settings.options.uiPreview',
    'dialog.about.updateChannel.label',
    'settings.options.debugLogging',
    'settings.options.verboseOutlookLogging',
    'settings.options.detailedEventsLogging',
  ];

  it('does not index developer-only settings while Developer Mode is off', () => {
    const keys = searchableKeys(context());
    DEVELOPER_ONLY_KEYS.forEach((key) => expect(keys).not.toContain(key));
  });

  it('indexes developer-only settings while Developer Mode is on', () => {
    const keys = searchableKeys(context({ isDeveloperModeEnabled: true }));
    DEVELOPER_ONLY_KEYS.forEach((key) => expect(keys).toContain(key));
  });

  it('does not index the update channel when updates are not allowed', () => {
    const keys = searchableKeys(
      context({ isDeveloperModeEnabled: true, canUpdate: false })
    );
    expect(keys).not.toContain('dialog.about.updateChannel.label');
  });

  it('indexes only the platform settings that the section renders', () => {
    const darwin = searchableKeys(context({ platform: 'darwin' }));
    const win32 = searchableKeys(context({ platform: 'win32' }));
    const linux = searchableKeys(context({ platform: 'linux' }));

    expect(darwin).toEqual(
      expect.arrayContaining([
        'settings.options.menuBarUnreadCount',
        'settings.options.transparentWindow',
      ])
    );
    [
      'settings.options.minimizeOnClose',
      'settings.options.menubar',
      'settings.options.ntlmCredentials',
      'settings.options.videoCallScreenCaptureFallback',
    ].forEach((key) => expect(darwin).not.toContain(key));

    expect(win32).toEqual(
      expect.arrayContaining([
        'settings.options.minimizeOnClose',
        'settings.options.ntlmCredentials',
        'settings.options.videoCallScreenCaptureFallback',
      ])
    );
    [
      'settings.options.menuBarUnreadCount',
      'settings.options.transparentWindow',
      'settings.options.menubar',
    ].forEach((key) => expect(win32).not.toContain(key));

    expect(linux).toContain('settings.options.menubar');
    [
      'settings.options.menuBarUnreadCount',
      'settings.options.transparentWindow',
      'settings.options.minimizeOnClose',
      'settings.options.ntlmCredentials',
      'settings.options.videoCallScreenCaptureFallback',
    ].forEach((key) => expect(linux).not.toContain(key));
  });

  it('does not index the update check when the component hides it', () => {
    const UPDATE_CHECK_KEYS = [
      'dialog.about.checkUpdates',
      'dialog.about.checkUpdatesOnStart',
    ];

    const hidden = searchableKeys(context({ canUpdate: false }));
    UPDATE_CHECK_KEYS.forEach((key) => expect(hidden).not.toContain(key));

    // A store build keeps its own check, so the component still renders it.
    const store = searchableKeys(
      context({ canUpdate: false, isStoreUpdate: true })
    );
    UPDATE_CHECK_KEYS.forEach((key) => expect(store).toContain(key));
  });

  it('does not index the web UI preview with no workspace', () => {
    expect(
      searchableKeys(context({ isDeveloperModeEnabled: true, serverCount: 0 }))
    ).not.toContain('settings.options.uiPreview');
    expect(
      searchableKeys(context({ isDeveloperModeEnabled: true, serverCount: 1 }))
    ).toContain('settings.options.uiPreview');
  });

  it('indexes the telephony server choice only with two or more workspaces', () => {
    expect(searchableKeys(context({ serverCount: 1 }))).not.toContain(
      'settings.options.telephonyServer'
    );
    expect(searchableKeys(context({ serverCount: 2 }))).toContain(
      'settings.options.telephonyServer'
    );
  });

  it('does not index the Outlook sync interval when an override sets it', () => {
    expect(
      searchableKeys(context({ isOutlookCalendarSyncIntervalOverridden: true }))
    ).not.toContain('settings.options.outlookCalendarSyncInterval');
    expect(searchableKeys(context())).toContain(
      'settings.options.outlookCalendarSyncInterval'
    );
  });

  it('gates only keys that the section lists', () => {
    SETTINGS_SECTIONS.forEach((section) => {
      Object.keys(section.settingAvailability ?? {}).forEach((key) =>
        expect(section.settingKeys).toContain(key)
      );
    });
  });
});
