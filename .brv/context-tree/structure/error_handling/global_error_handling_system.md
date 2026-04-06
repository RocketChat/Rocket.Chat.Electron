---
title: Global Error Handling System
tags: []
related: [structure/redux_store/redux_store_architecture.md, electron_apps/rocketchat_desktop/notification_system_architecture.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:19:14.423Z'
updatedAt: '2026-04-04T18:19:14.423Z'
---
## Raw Concept
**Task:**
Implement comprehensive error handling for main and renderer processes with Bugsnag integration

**Files:**
- src/errors.ts

**Flow:**
Uncaught exception/unhandled rejection -> log to console -> notify Bugsnag (if started) -> call app.quit() if critical

**Timestamp:** 2026-04-04

**Patterns:**
- `FATAL|Cannot access native module|Electron internal error` - Default critical error patterns that trigger app.quit()
- `/\\/Users\\/[^\\/]+/` - Regex to redact local user paths in Bugsnag reports

## Narrative
### Structure
Error handling is centralized in src/errors.ts. Provides separate setup functions for main process (setupMainErrorHandling) and renderer processes (setupRendererErrorHandling). Both register global handlers for uncaught exceptions and unhandled promise rejections. Bugsnag integration is conditional on BUGSNAG_API_KEY environment variable.

### Dependencies
Depends on @bugsnag/js for error reporting. Integrates with Redux store (select/listen) to read isReportEnabled and listen to SETTINGS_SET_REPORT_OPT_IN_CHANGED action. Electron app module for app.quit() and app.getVersion().

### Highlights
Pluggable critical error matcher via setCriticalErrorMatcher(fn) with cleanup/restore pattern. Idempotent setup functions guarded by _globalHandlersBound flag. Dynamic Bugsnag toggle based on user opt-in setting. Redacts local paths from error reports for privacy.

### Rules
Rule 1: setupGlobalErrorHandlers() is idempotent - can be called multiple times without side effects
Rule 2: Both uncaughtException and unhandledRejection handlers follow the same pattern: log, notify Bugsnag, quit if critical
Rule 3: setCriticalErrorMatcher returns a cleanup function that must be called to restore previous matcher
Rule 4: Bugsnag initialization is deferred if app version is not available
Rule 5: Critical errors trigger app.quit() immediately - no recovery attempted
Rule 6: User can toggle error reporting on/off via SETTINGS_SET_REPORT_OPT_IN_CHANGED action

### Examples
Example: const restore = setCriticalErrorMatcher((err) => err.message.includes("FATAL")); try { /* code */ } finally { restore(); }
Example: setupMainErrorHandling() registers both process error handlers and sets up Bugsnag listener
Example: In renderer, setupRendererErrorHandling("rootWindow") handles window.onerror and window.onunhandledrejection
