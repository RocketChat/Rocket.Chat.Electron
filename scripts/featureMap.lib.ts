import { readdirSync, readFileSync } from 'fs';
import { dirname, join, relative } from 'path';

// Finds the labels of the Settings controls and the menu items that the
// source shows, so that a spec can check that docs/feature-map.md lists each
// one. The map names each entry by its i18n key, so the check compares keys.

export type LabelSource = { key: string; file: string };

type TranslationTree = { [key: string]: unknown };

export const FEATURE_MAP_PATH = 'docs/feature-map.md';

const SETTINGS_SECTIONS_DIR = 'src/settingsWindow/sections';

// The search field of the settings window lives outside the sections.
const SETTINGS_SIDEBAR = 'src/settingsWindow/SettingsSidebar.tsx';

// The files that build the application menu, its popups, the workspace
// context menu, the tray menu and the workspace content context menu.
const MENU_FILES = [
  'src/ui/main/menuBar.ts',
  'src/ui/main/trayIcon.ts',
  'src/ui/main/serverView/popupMenu.ts',
];

const TRANSLATION_CALL = /\bt\(\s*['"]([\w.]+)['"]/g;

const findTranslationKeys = (text: string): string[] =>
  [...text.matchAll(TRANSLATION_CALL)].map(([, key]) => key);

// The text of each `label={…}` and `placeholder={…}` JSX prop, with nested
// braces kept whole. Both show text to the user. An `aria-label` is not
// visible, so it does not count.
export const findVisibleProps = (source: string): string[] => {
  const props: string[] = [];
  const opening = /(?<![\w-])(?:label|placeholder)=\{/g;

  for (const match of source.matchAll(opening)) {
    const start = (match.index ?? 0) + match[0].length;
    let depth = 1;
    let end = start;

    while (end < source.length && depth > 0) {
      if (source[end] === '{') depth += 1;
      if (source[end] === '}') depth -= 1;
      end += 1;
    }

    props.push(source.slice(start, end - 1));
  }

  return props;
};

const unique = (sources: LabelSource[]): LabelSource[] => {
  const seen = new Set<string>();
  return sources.filter(({ key }) => {
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const readSource = (root: string, file: string): string =>
  readFileSync(join(root, file), 'utf8');

// A Settings control is a feature component that a section renders. Its label
// is the `label` or `placeholder` prop of the field, or the `.title` key of
// its options namespace when the component draws its own label.
export const findSettingsKeysInSource = (source: string): string[] => [
  ...findVisibleProps(source).flatMap(findTranslationKeys),
  ...findTranslationKeys(source).filter((key) =>
    /^settings\.options\.\w+\.title(Darwin)?$/.test(key)
  ),
];

export const findSettingsLabelKeys = (root: string): LabelSource[] => {
  const sectionFiles = readdirSync(join(root, SETTINGS_SECTIONS_DIR))
    .filter((name) => /\.tsx$/.test(name) && !/\.spec\.tsx$/.test(name))
    .map((name) => `${SETTINGS_SECTIONS_DIR}/${name}`);

  const featureFiles = sectionFiles.flatMap((sectionFile) =>
    [
      ...readSource(root, sectionFile).matchAll(
        /from '(\.\.\/[\w./]*SettingsView\/features\/\w+)'/g
      ),
    ].map(([, importPath]) =>
      relative(root, join(root, dirname(sectionFile), `${importPath}.tsx`))
        .split('\\')
        .join('/')
    )
  );

  return unique(
    [...new Set([SETTINGS_SIDEBAR, ...sectionFiles, ...featureFiles])].flatMap(
      (file) =>
        findSettingsKeysInSource(readSource(root, file)).map((key) => ({
          key,
          file,
        }))
    )
  );
};

const parenDepth = (text: string): number =>
  (text.match(/\(/g) ?? []).length - (text.match(/\)/g) ?? []).length;

// A menu item label is a `t('…')` call in a `label:` or `labelKey:` property.
// The expression continues while a parenthesis is open (a call that Prettier
// wraps) and on the lines that start with `?` or `:` (a ternary).
export const findMenuKeysInSource = (source: string): string[] => {
  const lines = source.split('\n');

  return lines.flatMap((line, index) => {
    const labelKeyMatch = line.match(/\blabelKey:\s*['"]([\w.]+)['"]/);
    if (labelKeyMatch) return [labelKeyMatch[1]];

    if (!/\blabel:/.test(line)) return [];

    const expression = [line];
    for (let next = index + 1; next < lines.length; next += 1) {
      const open = parenDepth(expression.join('\n')) > 0;
      if (!open && !/^\s*[?:]/.test(lines[next])) break;
      expression.push(lines[next]);
    }

    return findTranslationKeys(expression.join('\n'));
  });
};

export const findMenuLabelKeys = (root: string): LabelSource[] =>
  unique(
    MENU_FILES.flatMap((file) =>
      findMenuKeysInSource(readSource(root, file)).map((key) => ({
        key,
        file,
      }))
    )
  );

const flatten = (tree: TranslationTree, prefix = ''): Record<string, string> =>
  Object.entries(tree).reduce<Record<string, string>>(
    (labels, [key, value]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return { ...labels, ...flatten(value as TranslationTree, path) };
      }
      return { ...labels, [path]: String(value) };
    },
    {}
  );

export const readEnglishLabels = (root: string): Record<string, string> =>
  flatten(JSON.parse(readSource(root, 'src/i18n/en.i18n.json')));

// The text that the English UI shows: no `&` access-key markers, and the app
// name in place of its placeholder.
export const toVisibleLabel = (label: string): string =>
  label
    .replace(/&&/g, '\u0000')
    .replace(/&/g, '')
    .replace(/\u0000/g, '&')
    .replace(/\{\{-?\s*appName\s*\}\}/g, 'Rocket.Chat');

export const findMissingEntries = ({
  kind,
  mapText,
  sources,
  english,
}: {
  kind: string;
  mapText: string;
  sources: LabelSource[];
  english: Record<string, string>;
}): string[] =>
  sources
    .filter(({ key }) => !mapText.includes(`\`${key}\``))
    .map(({ key, file }) => {
      const label = english[key]
        ? `"${toVisibleLabel(english[key])}"`
        : '(no English text)';
      return `${kind} ${label} (${key}, in ${file}) is not in ${FEATURE_MAP_PATH}. Add a row for it to the map, with the key in backticks.`;
    });
