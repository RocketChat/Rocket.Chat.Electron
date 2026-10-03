#!/bin/bash
# Report i18n key parity against en.i18n.json after editing a locale file

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Hooks fire for any path a subagent edits, including other repos — only act
# on paths inside this project.
ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"
case "$FILE_PATH" in
  "$ROOT"/*) ;;
  *) exit 0 ;;
esac

[[ "$FILE_PATH" == *"/src/i18n/"* || "$FILE_PATH" == src/i18n/* ]] || exit 0
[[ "$FILE_PATH" == *.i18n.json ]] || exit 0

I18N_DIR="${CLAUDE_PROJECT_DIR:-.}/src/i18n"
EN_FILE="$I18N_DIR/en.i18n.json"

[ -f "$EN_FILE" ] || exit 0

BASENAME=$(basename "$FILE_PATH")

node -e '
const fs = require("fs");
const path = require("path");

function flatten(obj, prefix = "") {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(out, flatten(v, key));
    } else {
      out[key] = true;
    }
  }
  return out;
}

function loadFlat(file) {
  try {
    return flatten(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch (e) {
    return null;
  }
}

const i18nDir = process.argv[1];
const enFile = process.argv[2];
const editedFile = process.argv[3];
const editedBasename = path.basename(editedFile);

const enFlat = loadFlat(enFile);
if (!enFlat) process.exit(0);
const enKeys = Object.keys(enFlat);

const localeFiles = fs
  .readdirSync(i18nDir)
  .filter((f) => f.endsWith(".i18n.json") && f !== "en.i18n.json");

if (editedBasename === "en.i18n.json") {
  const results = [];
  const missingEverywhere = new Set(enKeys);

  for (const f of localeFiles) {
    const flat = loadFlat(path.join(i18nDir, f));
    if (!flat) continue;
    const missing = enKeys.filter((k) => !(k in flat));
    results.push({ locale: f, missingCount: missing.length });
    const present = new Set(Object.keys(flat));
    for (const k of Array.from(missingEverywhere)) {
      if (present.has(k)) missingEverywhere.delete(k);
    }
  }

  results.sort((a, b) => b.missingCount - a.missingCount);
  const top5 = results.slice(0, 5);

  console.log(`i18n parity vs en.i18n.json (${results.length} other locales):`);
  for (const r of top5) {
    console.log(`  ${r.locale}: ${r.missingCount} missing`);
  }

  const newKeys = Array.from(missingEverywhere).slice(0, 10);
  if (newKeys.length > 0) {
    console.log(`Keys new in en, missing from ALL locales (needs translation), showing up to 10:`);
    for (const k of newKeys) {
      console.log(`  - ${k}`);
    }
  } else {
    console.log("No keys missing from every other locale.");
  }
} else {
  const flat = loadFlat(editedFile);
  if (!flat) process.exit(0);
  const localeKeys = Object.keys(flat);
  const enSet = new Set(enKeys);
  const stale = localeKeys.filter((k) => !enSet.has(k));
  const missing = enKeys.filter((k) => !(k in flat));

  console.log(`i18n parity for ${editedBasename} vs en.i18n.json:`);
  console.log(`  missing vs en: ${missing.length}`);
  console.log(`  stale (present here, absent from en): ${stale.length}`);
  if (stale.length > 0) {
    console.log("  stale keys (up to 10):");
    for (const k of stale.slice(0, 10)) {
      console.log(`    - ${k}`);
    }
  }
}
' "$I18N_DIR" "$EN_FILE" "$FILE_PATH" 2>/dev/null || true

exit 0
