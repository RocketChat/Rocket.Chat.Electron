import { readFileSync } from 'fs';
import { join } from 'path';

import {
  FEATURE_MAP_PATH,
  findMenuKeysInSource,
  findMenuLabelKeys,
  findMissingEntries,
  findSettingsKeysInSource,
  findSettingsLabelKeys,
  readEnglishLabels,
} from './featureMap.lib';

const root = join(__dirname, '..');
const mapText = readFileSync(join(root, FEATURE_MAP_PATH), 'utf8');
const english = readEnglishLabels(root);

// Keeps docs/feature-map.md in step with the UI: a new Settings control or
// menu item fails this spec until the map lists it.
describe('feature map', () => {
  it('lists every Settings control', () => {
    const sources = findSettingsLabelKeys(root);

    expect(sources.length).toBeGreaterThan(20);
    expect(
      findMissingEntries({
        kind: 'Settings control',
        mapText,
        sources,
        english,
      })
    ).toEqual([]);
  });

  it('lists every menu item', () => {
    const sources = findMenuLabelKeys(root);

    expect(sources.length).toBeGreaterThan(50);
    expect(
      findMissingEntries({ kind: 'Menu item', mapText, sources, english })
    ).toEqual([]);
  });

  it('names the missing label and asks to add it to the map', () => {
    expect(
      findMissingEntries({
        kind: 'Menu item',
        mapText: '| Reload | `menus.reload` |',
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
      `Menu item "Quit Rocket.Chat" (menus.quit, in src/ui/main/menuBar.ts) is not in ${FEATURE_MAP_PATH}. Add a row for it to the map, with the key in backticks.`,
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
});
