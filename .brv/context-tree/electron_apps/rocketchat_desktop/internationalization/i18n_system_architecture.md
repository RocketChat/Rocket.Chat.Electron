---
title: i18n System Architecture
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:12:40.133Z'
updatedAt: '2026-04-04T18:12:40.133Z'
---
## Raw Concept
**Task:**
Implement internationalization (i18n) system using i18next library with Service class pattern for main and renderer processes

**Changes:**
- I18nService extends Service with async initialization
- Supports 17 locales with dynamic import of JSON bundles
- Main process uses Redux store for language state
- Renderer process uses react-i18next integration
- Custom formatters for bytes, duration, percentage

**Files:**
- src/i18n/main.ts
- src/i18n/renderer.ts
- src/i18n/common.ts
- src/i18n/resources.ts
- src/i18n/actions.ts

**Flow:**
System locale detection -> Language code normalization -> Resource loading -> i18next initialization -> Translation function binding

**Timestamp:** 2026-04-04

## Narrative
### Structure
i18n system organized into: main.ts (I18nService singleton), renderer.ts (React integration), common.ts (config and formatters), resources.ts (locale bundle map), actions.ts (Redux actions). Main process initializes before renderer, renderer requests language via IPC.

### Dependencies
Depends on: i18next library, react-i18next, Electron app API (getSystemLocale), Redux store (dispatch/listen), Intl APIs (NumberFormat, RelativeTimeFormat, DateTimeFormat)

### Highlights
Key features: Fallback chain (system locale → en-US → en), Lazy-loaded locale bundles via dynamic import(), Custom formatters for file sizes and durations, Singleton pattern ensures single i18next instance, BCP-47 locale normalization

### Rules
Rule 1: Fallback language is always "en"
Rule 2: Locale code must be 2-char language code, optionally with 2-char country code (e.g., de-DE, ja)
Rule 3: Unsupported locales fall back to first language matching language code (e.g., de-AT falls back to de-DE)
Rule 4: Resources loaded asynchronously via dynamic import
Rule 5: Main process initializes before renderer process
Rule 6: Translation function (t) is bound from i18next singleton

### Examples
Example locale detection: system locale "de-DE" → hasLng("de-DE") → true → load de-DE resources
Example fallback: system locale "de-AT" → hasLng("de-AT") → false → find language starting with "de" → de-DE
Example formatter: formatByteSpeed(1048576) → "1 MB/s" using Intl.NumberFormat with compact notation
