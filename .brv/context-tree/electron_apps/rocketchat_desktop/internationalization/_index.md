---
children_hash: 96938ac3e809a2047c31d74c7a806130f9fdf0c927c6e663e21baa0b48dac07f
compression_ratio: 0.8258706467661692
condensation_order: 0
covers: [i18n_system_architecture.md]
covers_token_total: 603
summary_level: d0
token_count: 498
type: summary
---
# Internationalization System Architecture

## Overview
The i18n system implements multi-locale support using i18next with a Service class pattern, supporting 17 locales across main and renderer processes. System locale detection triggers automatic language initialization with fallback chains.

## Core Components

**I18nService** (src/i18n/main.ts)
- Singleton service extending Service base class with async initialization
- Manages i18next instance lifecycle in main process
- Detects system locale via Electron app API and normalizes to BCP-47 format

**Renderer Integration** (src/i18n/renderer.ts)
- React-i18next integration for UI translation
- Requests language state from main process via IPC
- Binds translation function (t) from i18next singleton

**Configuration & Utilities** (src/i18n/common.ts, resources.ts, actions.ts)
- Locale bundle map with dynamic import() for lazy loading
- Redux actions for language state management
- Custom formatters: bytes (compact notation), duration (relative time), percentage

## Locale Resolution Strategy

**Fallback Chain:** System locale → en-US → en

**Normalization Rules:**
- Accepts 2-char language codes (e.g., ja) or language-country pairs (e.g., de-DE)
- Unsupported locales match first language code (de-AT → de-DE)
- All locale codes normalized to BCP-47 format

**Resource Loading:** Asynchronous via dynamic import() with lazy evaluation

## Key Architectural Decisions

- **Singleton Pattern:** Single i18next instance ensures consistent translation state
- **Process Separation:** Main process initializes before renderer; renderer requests state via IPC
- **Redux Integration:** Language state persisted in Redux store for main process
- **Intl APIs:** Leverages native Intl.NumberFormat, RelativeTimeFormat, DateTimeFormat for formatting
- **Async Initialization:** Service pattern ensures resources load before translation requests

## Dependencies
i18next, react-i18next, Electron app API, Redux store, native Intl APIs