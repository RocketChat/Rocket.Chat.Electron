---
name: i18n-translate
description: Translate keys added to src/i18n/en.i18n.json into every other locale file at the end of a feature, preserving key order and placeholders
disable-model-invocation: true
---

# i18n Translate

Developers edit only `src/i18n/en.i18n.json` while a feature is in
progress. When the feature is finished, this skill translates every new
or changed key into all other locale files in one pass. Lingohub reviews
the translations afterward (its bot commits "Language update from
Lingohub") — this skill does not need to be perfect, just correct and
consistent.

**When to run**: at feature completion, before `pr-check`.

## Background

- Read `.claude/skills/i18n-audit/SKILL.md` for the key-flattening/coverage
  approach this skill reuses.
- `src/i18n/en.i18n.json` is a nested JSON object; keys are addressed with
  dot notation (e.g. `dialog.about.title`).
- i18next placeholders like `{{name}}` and `{{- name}}` (unescaped) must be
  preserved verbatim, including the `-` prefix where present. HTML-ish
  tags such as `<1>...</1>` also appear in values (e.g.
  `dialog.about.version`) and must be preserved verbatim.
- Plural keys use i18next suffixes `_one` / `_other` (e.g. `count_one`,
  `count_other`, `unreadMessage_one`, `unreadMessage_other`) — translate
  both forms with correct plural grammar for the target locale, keeping
  the same key names (i18next plural suffixes are not translated).
- Locale files: `src/i18n/*.i18n.json` (currently `ar`, `de-DE`, `es`,
  `fi`, `fr`, `hu`, `it-IT`, `ja`, `nb-NO`, `nn`, `no`, `pl`, `pt-BR`,
  `ru`, `se`, `sv`, `tr-TR`, `uk-UA`, `zh`, `zh-CN`, `zh-TW`).
- `src/i18n/__tests__/resources.spec.ts` asserts the set of locales
  `resources.ts` exposes loaders for, and that a sample of locales
  (`de-DE`, `pt-BR`, `ja`) load as non-empty objects — it does not assert
  per-key parity. `src/i18n/__tests__/common.spec.ts` and `actions.spec.ts`
  cover formatting/action-constant behavior, not locale content. There is
  no test that fails on missing keys; parity is enforced by
  `.claude/hooks/i18n-parity.sh`'s report, not by CI.

## Steps

### (a) Compute missing keys per locale

Reuse the flatten approach from `i18n-audit` / `.claude/hooks/i18n-parity.sh`.
Quick one-liner per locale:

```sh
node -e '
const fs = require("fs");
function flatten(obj, prefix = "") {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) Object.assign(out, flatten(v, key));
    else out[key] = v;
  }
  return out;
}
const en = flatten(JSON.parse(fs.readFileSync("src/i18n/en.i18n.json", "utf8")));
const locale = flatten(JSON.parse(fs.readFileSync(process.argv[1], "utf8")));
const missing = Object.keys(en).filter((k) => !(k in locale));
for (const k of missing) console.log(k, "=>", JSON.stringify(en[k]));
' src/i18n/pt-BR.i18n.json
```

Or simply run `.claude/hooks/i18n-parity.sh`'s logic against `en.i18n.json`
(it prints missing-key counts per locale and the keys missing from every
locale) to get the full picture across all locales at once.

### (b) Translate missing values, locale by locale

For each locale, translate only the missing values — natural,
product-appropriate translations for a desktop chat client UI. Do not
touch existing translations (Lingohub owns those and will overwrite
drift; touching them just creates unnecessary diff noise). Preserve:

- `{{placeholder}}` / `{{- placeholder}}` tokens exactly, including the
  `-` prefix.
- Embedded tags like `<1>...</1>`.
- Trailing punctuation and any leading `&` accelerator markers (e.g.
  `&Copy` style menu accelerators) — keep the `&` before the
  locale-appropriate mnemonic letter if the target locale conventionally
  uses one, otherwise drop it rather than mistranslate it.
- Both `_one` and `_other` plural forms, translated with correct grammar
  for that locale's pluralization rules (not just a copy of the English
  form).

Never invent new keys that don't exist in `en.i18n.json`.

### (c) Insert at the correct position

Insert each new key at the same position and nesting level it occupies in
`en.i18n.json`, matching the surrounding structure (same parent objects,
same key order) so the locale file's shape mirrors English.

### (d) Parallelize for many locales

If more than 5 locales need translation, dispatch parallel
`builder-trivial` agents, one per locale, each given the exact list of
missing keys and their English source values for that locale. If 5 or
fewer locales need translation, do the edits inline instead.

### (e) Verify

Run the i18n spec suite:

```sh
yarn test --runTestsByPath src/i18n/__tests__/resources.spec.ts src/i18n/__tests__/common.spec.ts src/i18n/__tests__/actions.spec.ts src/i18n/__tests__/renderer.spec.ts
```

(Confirm actual file names under `src/i18n/__tests__/` before running —
use `yarn test --listTests --runTestsByPath <file>` if discovery is
uncertain, per `AGENTS.md` Testing conventions.)

Then re-run the parity check (`.claude/hooks/i18n-parity.sh`'s logic, or
the one-liner from step (a)) against every locale to confirm zero missing
keys remain.

### (f) Handoff to Lingohub

Lingohub reviews and refines these translations afterward via its own
commits ("Language update from Lingohub"), so aim for correct-and-consistent
rather than perfect — the goal is to unblock the PR with complete key
coverage, not to ship final-quality copy.
