---
name: i18n-audit
description: Audit translation completeness across all language files
---

# i18n Translation Audit

Compare all language files against the English reference (`src/i18n/en.i18n.json`) and report translation coverage.

## Arguments

- `language` (optional): Audit a specific language code (e.g., `pt-BR`, `ja`). Defaults to all languages.
- `verbose` (optional): If "true", list every missing key. Otherwise show summary only.

## Steps

### 1. Load Reference Keys

Read `src/i18n/en.i18n.json` and extract all keys (including nested keys using dot notation, e.g., `dialog.about.title`).

### 2. Scan All Languages

For each `*.i18n.json` file in `src/i18n/` (except `en.i18n.json`):
1. Extract all keys using the same dot notation
2. Compare against the English reference
3. Record:
   - **Missing keys**: Present in `en` but absent in this language
   - **Extra keys**: Present in this language but absent in `en` (possibly outdated)
   - **Total keys**: Count in this language vs English

### 3. Generate Report

Output a summary table:

```
Language     | Keys | Missing | Extra | Coverage
-------------|------|---------|-------|--------
pt-BR        | 142  | 3       | 0     | 97.9%
ja           | 138  | 7       | 1     | 95.2%
...
```

If `verbose` is "true", also list the specific missing and extra keys per language.

### 4. Highlight Critical Gaps

Flag any language below 90% coverage as needing attention.

## Languages

The project has 22 language files:
ar, de-DE, en (reference), es, fi, fr, hu, it-IT, ja, nb-NO, nn, no, pl, pt-BR, ru, se, sv, tr-TR, uk-UA, zh, zh-CN, zh-TW
