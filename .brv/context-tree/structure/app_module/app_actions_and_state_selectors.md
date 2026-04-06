---
title: App Actions and State Selectors
tags: []
related: [structure/redux_store/redux_store_architecture.md, structure/redux_store/fsa_type_system_and_validation.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:23:47.628Z'
updatedAt: '2026-04-04T18:23:47.628Z'
---
## Raw Concept
**Task:**
Document Redux action types and state selectors for app module initialization and settings management

**Changes:**
- APP_ERROR_THROWN - Error handling action
- APP_PATH_SET - Application path configuration
- APP_VERSION_SET - Version tracking
- APP_SETTINGS_LOADED - Persisted settings initialization
- APP_ALLOWED_NTLM_CREDENTIALS_DOMAINS_SET - NTLM domain whitelist
- APP_MAIN_WINDOW_TITLE_SET - Window title management
- APP_MACHINE_THEME_SET - OS theme detection
- APP_SCREEN_CAPTURE_FALLBACK_FORCED_SET - Screen capture fallback flag

**Files:**
- src/app/actions.ts
- src/app/selectors.ts

**Flow:**
Redux actions dispatched -> state updated -> selectors retrieve typed state -> components consume state

**Patterns:**
- `^APP_[A-Z_]+$` (flags: g) - Redux action type constants follow APP_ prefix convention
- `^is[A-Z]\w+Enabled$` (flags: g) - Boolean feature flags use is*Enabled naming pattern

## Narrative
### Structure
App module exports action type constants (src/app/actions.ts) and Redux selectors (src/app/selectors.ts). Actions map to typed payloads via AppActionTypeToPayloadMap. selectPersistableValues uses reselect's createStructuredSelector to memoize state access.

### Dependencies
Depends on PersistableValues type and RootState from store/rootReducer. Uses reselect library for selector memoization.

### Highlights
Supports 41 distinct state selectors covering UI preferences (theme, window state, sidebar), feature flags (updates, developer mode, Jitsi), security settings (NTLM credentials, certificates), and application metadata (version, window title). OverrideOnlySettings type allows Outlook-specific configuration overrides.

### Rules
Rule 1: All action types must be exported as string constants
Rule 2: AppActionTypeToPayloadMap must define type for each action
Rule 3: selectPersistableValues uses createStructuredSelector for memoization
Rule 4: Boolean settings use isXxxEnabled naming convention
Rule 5: Settings extend Partial<PersistableValues> for type safety

### Examples
Example action dispatch: { type: APP_SETTINGS_LOADED, payload: { isMenuBarEnabled: true, isTrayIconEnabled: true } }
Example selector usage: selectPersistableValues(state) returns memoized object with all 41 state properties
