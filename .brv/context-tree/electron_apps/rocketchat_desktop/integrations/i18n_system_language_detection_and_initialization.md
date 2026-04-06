---
title: i18n System Language Detection and Initialization
tags: []
related: [electron_apps/rocketchat_desktop/internationalization/i18n_system_architecture.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:22:24.923Z'
updatedAt: '2026-04-04T18:22:24.923Z'
---
## Raw Concept
**Task:**
Implement internationalization with system locale detection and fallback mechanisms

**Changes:**
- Implemented system locale detection via app.getSystemLocale()
- Implemented language code validation (2 chars) and country code validation (2 chars uppercase)
- Implemented fallback chain: exact match -> language prefix match -> fallbackLng
- Implemented I18nService class extending Service base class

**Files:**
- src/i18n/main.ts

**Flow:**
app.getSystemLocale() -> parse [languageCode]-[countryCode] -> validate format -> check exact match in resources -> fallback to language prefix -> fallback to fallbackLng -> initializeAsync() -> listen I18N_LNG_REQUESTED -> dispatch I18N_LNG_RESPONDED

**Timestamp:** 2026-04-04

## Narrative
### Structure
I18nService class extends Service base class and manages language detection and initialization. getLng() gets system locale via app.getSystemLocale(), parses as [languageCode]-[countryCode], validates languageCode (2 chars) and countryCode (optional, 2 chars uppercase). Fallback chain: exact match in resources -> language prefix match -> fallbackLng. I18nService exports getLanguage variable for current language and i18nService singleton instance.

### Dependencies
Depends on i18next for translation engine, i18next-react for React integration, Electron app.getSystemLocale() for system locale

### Highlights
Language validation ensures languageCode is exactly 2 characters and countryCode is uppercase. Fallback mechanism ensures graceful degradation. I18nService.wait() returns initialization promise for async initialization. I18nService.t is bound i18next.t function.

### Rules
Rule 1: Language code must be exactly 2 characters
Rule 2: Country code must be 2 characters uppercase (optional)
Rule 3: Fallback chain: exact match -> language prefix -> fallbackLng
Rule 4: I18nService must wait for initialization before use
