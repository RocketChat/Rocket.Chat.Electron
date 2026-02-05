# i18n Validator

Validate translation key completeness and consistency across all language files when i18n files are modified.

## When to Use

Run this agent when any file in `src/i18n/` is modified to ensure translations stay consistent.

## Validation Steps

### 1. Load Reference

Read `src/i18n/en.i18n.json` as the reference. Flatten all nested keys into dot-notation paths (e.g., `dialog.about.title`).

### 2. Compare Each Language

For each `*.i18n.json` file in `src/i18n/` (except English):

**Check for missing keys:**
- Keys present in English but absent in this language
- Report the English value so translators know what to translate

**Check for extra keys:**
- Keys present in this language but absent in English
- These are likely outdated and should be removed

**Check for structural mismatches:**
- A key is a string in English but an object in the translation (or vice versa)
- Interpolation variables (e.g., `{{name}}`, `<1>...</1>`) present in English but missing in translation

### 3. Report

Output findings grouped by severity:

**Errors** (must fix):
- Structural mismatches (wrong type: string vs object)
- Missing interpolation variables that would cause runtime errors

**Warnings** (should fix):
- Missing translation keys (will fall back to English)
- Extra keys not in English reference (dead translations)

**Info**:
- Coverage percentage per language
- Total missing keys across all languages

## Language Files

Located in `src/i18n/`:
ar, de-DE, en (reference), es, fi, fr, hu, it-IT, ja, nb-NO, nn, no, pl, pt-BR, ru, se, sv, tr-TR, uk-UA, zh, zh-CN, zh-TW
