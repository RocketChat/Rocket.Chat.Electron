---
title: Spell Checking System
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:14:57.879Z'
updatedAt: '2026-04-04T18:14:57.879Z'
---
## Raw Concept
**Task:**
Implement Electron built-in spell checker integration with Redux action listeners

**Changes:**
- setupSpellChecking() initializes spell checker with current languages
- Listens to SPELL_CHECKING_TOGGLED action to enable/disable spell checking globally
- Listens to SPELL_CHECKING_LANGUAGE_TOGGLED action to add/remove individual languages
- Applies language changes to all active webContents sessions

**Files:**
- src/spellChecking/main.ts
- src/spellChecking/actions.ts

**Flow:**
Redux action dispatched -> listen() captures action -> setSpellCheckerLanguages() applies to all sessions

**Timestamp:** 2026-04-04

## Narrative
### Structure
Spell checking system in src/spellChecking/ uses Electron's chromium built-in spell checker. Main entry point is setupSpellChecking() which registers Redux action listeners. Language state is managed via a Set<string> of active language codes.

### Dependencies
Depends on Electron session and webContents APIs. Requires Redux store with listen() utility for action subscriptions. Uses session.availableSpellCheckerLanguages to validate supported languages.

### Highlights
Uses Electron's native chromium spell checker (no external library). Supports multiple languages simultaneously. Language changes are applied to both defaultSession and all active webContents. Spell checker can be toggled on/off globally while preserving language preferences.

### Rules
Rule 1: When SPELL_CHECKING_TOGGLED is true, restore all previously saved languages
Rule 2: When SPELL_CHECKING_TOGGLED is false, clear all languages (disables spell checking)
Rule 3: Only apply languages that exist in session.availableSpellCheckerLanguages
Rule 4: Apply language changes to both session.defaultSession and all active webContents

### Examples
Example action: { type: "spell-checking/toggled", payload: true } enables spell checking with saved languages
Example action: { type: "spell-checking/language-toggled", payload: { name: "en-US", enabled: true } } adds English to active languages

## Facts
- **spell_checker_library**: Spell checker uses Electron's chromium built-in implementation [project]
- **language_state_type**: Language state is stored in a Set<string> of active language codes [project]
- **language_source**: Available languages come from session.availableSpellCheckerLanguages [project]

---

const setSpellCheckerLanguages = async (languages: Set<string>): Promise<void> => {
  await app.whenReady();
  const filteredLanguages = Array.from(languages).filter((language) =>
    session.defaultSession.availableSpellCheckerLanguages.includes(language)
  );
  session.defaultSession.setSpellCheckerLanguages(filteredLanguages);
  webContents.getAllWebContents().forEach((webContents) => {
    webContents.session.setSpellCheckerLanguages(filteredLanguages);
  });
};

---

export const SPELL_CHECKING_TOGGLED = 'spell-checking/toggled';
export const SPELL_CHECKING_LANGUAGE_TOGGLED = 'spell-checking/language-toggled';
export type SpellCheckingActionTypeToPayloadMap = {
  [SPELL_CHECKING_TOGGLED]: boolean;
  [SPELL_CHECKING_LANGUAGE_TOGGLED]: { name: string; enabled: boolean };
};
