import { SETTINGS_SECTIONS } from '../sections';

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
