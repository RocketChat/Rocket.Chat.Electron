---
name: i18n-audit
description: Report the translation coverage of every locale file against src/i18n/en.i18n.json (missing and extra keys, coverage, loaded and unloaded locales). Use when asked about translation coverage, or before a release.
---

# i18n Translation Audit

Compare all language files against the English reference
(`src/i18n/en.i18n.json`) and report the translation coverage.

## Arguments

- `language` (optional): Audit one language code (e.g., `pt-BR`, `ja`). Defaults to all languages.
- `verbose` (optional): If "true", list every missing key. Otherwise show the summary only.

## Steps

### 1. Load Reference Keys

Read `src/i18n/en.i18n.json`. Extract all keys, including nested keys in dot notation (e.g., `dialog.about.title`).

### 2. Scan All Languages

For each `*.i18n.json` file in `src/i18n/` (except `en.i18n.json`):

1. Extract all keys in the same dot notation.
2. Compare them against the English reference.
3. Record these values:
   - **Missing keys**: Present in `en` but absent in this language
   - **Extra keys**: Present in this language but absent in `en` (possibly outdated)
   - **Total keys**: Count in this language and in English

### 3. Generate Report

Output a summary table:

```
Language     | Keys | Missing | Extra | Coverage
-------------|------|---------|-------|--------
pt-BR        | 142  | 3       | 0     | 97.9%
ja           | 138  | 7       | 1     | 95.2%
...
```

If `verbose` is "true", also list the missing and extra keys for each language.

### 4. Highlight Critical Gaps

Flag each language below 90% coverage as needing attention.

## Languages

Every `*.i18n.json` file in `src/i18n/` is a language file, and `en.i18n.json` is the reference.

`src/i18n/resources.ts` does not load `ar`, `nn` and `se`, so users never see them. Report them apart from the loaded locales. The loader keys `nb` and `nn` read `no.i18n.json`, and `zh` reads `zh-CN.i18n.json`.
