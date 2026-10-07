# i18n Validator

Check that translation keys are complete and consistent across all language files when someone changes an i18n file.

## When to Use

Run this agent when any file in `src/i18n/` changes. It keeps translations consistent.

## Validation Steps

### 1. Load Reference

Read `src/i18n/en.i18n.json` as the reference. Flatten all nested keys into dot-notation paths (e.g., `dialog.about.title`).

### 2. Compare Each Language

For each `*.i18n.json` file in `src/i18n/` (except English):

**Check for missing keys:**

- Keys present in English but absent in this language
- Report the English value, so translators know what to translate

**Check for extra keys:**

- Keys present in this language but absent in English
- These keys are likely outdated. Remove them.

**Check for structural mismatches:**

- A key is a string in English but an object in the translation (or the reverse)
- Interpolation variables (e.g., `{{name}}`, `<1>...</1>`) present in English but absent in the translation

### 3. Report

Output the findings grouped by severity:

**Errors** (must fix):

- Structural mismatches (wrong type: string or object)
- Missing interpolation variables that would cause runtime errors

**Warnings** (should fix):

- Missing translation keys (the app falls back to English)
- Extra keys not in the English reference (dead translations)

**Info**:

- Coverage percentage for each language
- Total missing keys across all languages

## Language Files

Located in `src/i18n/`:
ar, de-DE, en (reference), es, fi, fr, hu, it-IT, ja, nb-NO, nn, no, pl, pt-BR, ru, se, sv, tr-TR, uk-UA, zh, zh-CN, zh-TW
