import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

import resources from '../resources';

type Language = keyof typeof resources;

const localeDirectory = join(__dirname, '..');

const localeFiles = readdirSync(localeDirectory).filter((file) =>
  file.endsWith('.i18n.json')
);

// JSON.parse keeps only the last of two equal keys in one object, so a
// duplicate silently replaces the first value. This scan reports each key
// that occurs twice in the same object.
const findDuplicateKeys = (json: string): string[] => {
  const duplicates: string[] = [];
  const objects: (Set<string> | null)[] = [];
  let index = 0;
  while (index < json.length) {
    const char = json[index];
    if (char === '"') {
      let end = index + 1;
      while (json[end] !== '"') {
        end += json[end] === '\\' ? 2 : 1;
      }
      const token = JSON.parse(json.slice(index, end + 1)) as string;
      const keys = objects[objects.length - 1];
      if (keys && /^\s*:/.test(json.slice(end + 1))) {
        if (keys.has(token)) {
          duplicates.push(token);
        }
        keys.add(token);
      }
      index = end + 1;
      continue;
    }
    if (char === '{') objects.push(new Set());
    if (char === '[') objects.push(null);
    if (char === '}' || char === ']') objects.pop();
    index += 1;
  }
  return duplicates;
};

// Each of these locales must translate every English key. A change that adds
// an English key must add it to these locales too, or users see English text
// inside a translated window.
const COMPLETE_LOCALES: readonly Language[] = ['de-DE'];

const translatedLocales = (Object.keys(resources) as Language[]).filter(
  (language) => language !== 'en'
);

const flatten = (tree: unknown, prefix = ''): Map<string, unknown> => {
  const entries = new Map<string, unknown>();
  for (const [key, value] of Object.entries(tree as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flatten(value, path).forEach((nested, nestedPath) =>
        entries.set(nestedPath, nested)
      );
    } else {
      entries.set(path, value);
    }
  }
  return entries;
};

const loadFlat = async (language: Language) => {
  const resource = (await resources[language]()) as { default?: unknown };
  return flatten(resource.default ?? resource);
};

// `{{- version}}` and `{{version}}` name the same value, and
// `{{bytes, byteSize}}` names `bytes` with a formatter.
const placeholderNames = (value: string) =>
  [...value.matchAll(/\{\{(.*?)\}\}/g)]
    .map(([, inner]) =>
      inner
        .split(',')[0]
        .replace(/^\s*-\s*/, '')
        .trim()
    )
    .sort();

// `<1>…</1>` marks the components that `<Trans>` puts in the string.
const componentTags = (value: string) =>
  [...value.matchAll(/<\/?\d+>/g)].map(([tag]) => tag).sort();

describe('i18n locale parity', () => {
  let english: Map<string, unknown>;

  beforeAll(async () => {
    english = await loadFlat('en');
  });

  it.each(localeFiles)('%s has no duplicate keys', (file) => {
    const json = readFileSync(join(localeDirectory, file), 'utf8');

    expect(findDuplicateKeys(json)).toEqual([]);
  });

  it.each(COMPLETE_LOCALES)(
    '%s translates every English key',
    async (language) => {
      const locale = await loadFlat(language);

      const missing = [...english.keys()].filter((key) => !locale.has(key));

      expect(missing).toEqual([]);
    }
  );

  it.each(translatedLocales)(
    '%s keeps the placeholders and tags of each English string',
    async (language) => {
      const locale = await loadFlat(language);

      const mismatches = [...locale.entries()]
        .filter(
          ([key, value]) =>
            typeof value === 'string' && typeof english.get(key) === 'string'
        )
        .filter(([key, value]) => {
          const source = english.get(key) as string;
          const target = value as string;
          return (
            placeholderNames(source).join() !==
              placeholderNames(target).join() ||
            componentTags(source).join() !== componentTags(target).join()
          );
        })
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`);

      expect(mismatches).toEqual([]);
    }
  );
});
