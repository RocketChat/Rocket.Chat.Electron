---
title: Spell Checking System Language Management
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:22:24.925Z'
updatedAt: '2026-04-04T18:22:24.925Z'
---
## Raw Concept
**Task:**
Manage spell checking languages across Electron sessions and web contents

**Changes:**
- Implemented language filtering against available spell checker languages
- Implemented spell checker language toggling
- Implemented application of spell checker languages to default session and all webContents

**Files:**
- src/spellChecking/main.ts

**Flow:**
setupSpellChecking() -> initialize with default session languages -> [SPELL_CHECKING_TOGGLED/SPELL_CHECKING_LANGUAGE_TOGGLED] -> setSpellCheckerLanguages() -> filter against availableSpellCheckerLanguages -> apply to default session and webContents

## Narrative
### Structure
Spell checking system in src/spellChecking/main.ts manages spell checker languages across Electron sessions. setupSpellChecking() initializes with default session languages. setSpellCheckerLanguages() filters against session.defaultSession.availableSpellCheckerLanguages and applies to both default session and all webContents.

### Dependencies
Depends on Electron session API for spell checker language management

### Highlights
Language filtering ensures only available spell checker languages are applied. SPELL_CHECKING_TOGGLED listener enables/disables spell checking (enabled uses current languages, disabled clears languages). SPELL_CHECKING_LANGUAGE_TOGGLED adds/removes language from set and reapplies.

### Rules
Rule 1: Only apply languages available in session.defaultSession.availableSpellCheckerLanguages
Rule 2: SPELL_CHECKING_TOGGLED disables all languages when disabled
Rule 3: Apply language changes to both default session and all webContents
