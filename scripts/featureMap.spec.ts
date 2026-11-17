import { readFileSync } from 'fs';
import { join } from 'path';

import {
  FEATURE_MAP_PATH,
  findMapKeys,
  findMenuKeysInSource,
  findMenuLabelKeys,
  findMissingEntries,
  findSettingsKeysInSource,
  findSettingsLabelKeys,
  findUnknownMapKeys,
  readEnglishLabels,
} from './featureMap.lib';

const root = join(__dirname, '..');
const mapText = readFileSync(join(root, FEATURE_MAP_PATH), 'utf8');
const english = readEnglishLabels(root);
const mapKeys = findMapKeys(mapText);

// Keeps docs/feature-map.md in step with the UI: a new Settings control or
// menu item fails this spec until the map lists it, and a map key that the
// English file no longer has fails it until the row is updated.
describe('feature map', () => {
  it('lists every Settings control', () => {
    const sources = findSettingsLabelKeys(root);

    expect(sources.length).toBeGreaterThan(20);
    expect(
      findMissingEntries({
        kind: 'Settings control',
        mapKeys,
        sources,
        english,
      })
    ).toEqual([]);
  });

  it('names only keys that the English file has', () => {
    expect(mapKeys.size).toBeGreaterThan(200);
    expect(findUnknownMapKeys(mapKeys, english)).toEqual([]);
  });

  it('lists every menu item', () => {
    const sources = findMenuLabelKeys(root);

    expect(sources.length).toBeGreaterThan(50);
    expect(
      findMissingEntries({ kind: 'Menu item', mapKeys, sources, english })
    ).toEqual([]);
  });

  it('names the missing label and asks to add it to the map', () => {
    expect(
      findMissingEntries({
        kind: 'Menu item',
        mapKeys: new Set(['menus.reload']),
        sources: [
          { key: 'menus.reload', file: 'src/ui/main/menuBar.ts' },
          { key: 'menus.quit', file: 'src/ui/main/menuBar.ts' },
        ],
        english: {
          'menus.reload': '&Reload',
          'menus.quit': '&Quit {{- appName}}',
        },
      })
    ).toEqual([
      `Menu item "Quit Rocket.Chat" (menus.quit, in src/ui/main/menuBar.ts) is not in ${FEATURE_MAP_PATH}. Add a row for it to the map, with the key in backticks in the Key column.`,
    ]);
  });

  it('reads the keys of visible placeholder props, not aria-label', () => {
    expect(
      findSettingsKeysInSource(
        [
          "<TextInput placeholder={t('certificatesManager.filter')} />",
          "<Field label={t('settings.options.foo.label')} />",
          "<Icon aria-label={t('settings.hidden')} />",
          '<TextInput',
          '  placeholder={t(',
          "    'settings.options.telephonyGlobalShortcut.placeholder'",
          '  )}',
          '/>',
        ].join('\n')
      )
    ).toEqual([
      'certificatesManager.filter',
      'settings.options.foo.label',
      'settings.options.telephonyGlobalShortcut.placeholder',
    ]);
  });

  it('reads a menu label whose t() call wraps to the next line', () => {
    expect(
      findMenuKeysInSource(
        [
          '{',
          '  label: t(',
          "    'menus.someVeryLongMenuItemKeyThatPrettierWraps'",
          '  ),',
          '  click: () => undefined,',
          "  label: isOn ? t('menus.on')",
          "    : t('menus.off'),",
          "  labelKey: 'menus.quit',",
          '}',
        ].join('\n')
      )
    ).toEqual([
      'menus.someVeryLongMenuItemKeyThatPrettierWraps',
      'menus.on',
      'menus.off',
      'menus.quit',
    ]);
  });

  it('reads button and field label text, but not status text', () => {
    expect(
      findSettingsKeysInSource(
        [
          '<Button onClick={check}>',
          "  {t('dialog.about.checkUpdates')}",
          '</Button>',
          "<FieldLabel>{t('settings.options.uiPreview.applyTo')}</FieldLabel>",
          "setStatus({ text: t('settings.options.uiPreview.loading') });",
        ].join('\n')
      )
    ).toEqual([
      'dialog.about.checkUpdates',
      'settings.options.uiPreview.applyTo',
    ]);
  });

  it('reads keys only from the Key column of the map tables', () => {
    expect([
      ...findMapKeys(
        [
          'The key `prose.only` is named in prose.',
          '',
          '| Visible name | Key | Source |',
          '| --- | --- | --- |',
          '| Reload | `menus.reload`, `menus.quit` | `src/ui/main/menuBar.ts` |',
          '',
          '| Layout | What the user sees |',
          '| --- | --- |',
          '| Tabs | `not.a.key` |',
        ].join('\n')
      ),
    ]).toEqual(['menus.reload', 'menus.quit']);
  });

  it('accepts a plural base key and names an unknown key', () => {
    expect(
      findUnknownMapKeys(new Set(['tabBar.unreadMessage', 'menus.gone']), {
        'tabBar.unreadMessage_one': '{{count}} unread message',
      })
    ).toEqual([
      `${FEATURE_MAP_PATH} names the key menus.gone, but src/i18n/en.i18n.json does not have it. Update or remove the row.`,
    ]);
  });
});
