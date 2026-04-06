---
children_hash: b3fd09c1d8b7c77bb89591b674da9307483b31a9e60982c4c7a14c9ea8a3299c
compression_ratio: 0.572463768115942
condensation_order: 1
covers: [context.md, global_error_handling_system.md]
covers_token_total: 828
summary_level: d1
token_count: 474
type: summary
---
# Error Handling Architecture

## Overview
Centralized error handling pipeline for main and renderer processes with critical error detection, Bugsnag integration, and user-controlled reporting.

## Core Components

**Setup Functions**
- `setupMainErrorHandling()` - Registers main process handlers and Bugsnag listener
- `setupRendererErrorHandling(windowName)` - Registers renderer process handlers for window.onerror and window.onunhandledrejection
- Both are idempotent (guarded by `_globalHandlersBound` flag)

**Error Flow**
Uncaught exception/unhandled rejection → log to console → notify Bugsnag (if enabled) → call `app.quit()` if critical

**Critical Error Detection**
- Default patterns: `FATAL|Cannot access native module|Electron internal error`
- Pluggable via `setCriticalErrorMatcher(fn)` with cleanup/restore pattern
- Triggers immediate `app.quit()` with no recovery

## Key Features

**Bugsnag Integration**
- Conditional on `BUGSNAG_API_KEY` environment variable
- Dynamic toggle via Redux `SETTINGS_SET_REPORT_OPT_IN_CHANGED` action
- Deferred initialization if app version unavailable
- Path redaction (`/\/Users\/[^\/]+/`) for privacy in reports

**Privacy & Control**
- Local user paths redacted from error reports
- User opt-in setting controls error reporting
- Listens to Redux store for `isReportEnabled` state

**Handler Pattern**
Both uncaughtException and unhandledRejection follow identical flow: log → Bugsnag notify → conditional quit

## Dependencies
- `@bugsnag/js` for error reporting
- Redux store for opt-in state and action listening
- Electron app module for `app.quit()` and `app.getVersion()`

## Related Topics
- **structure/redux_store** - State management integration
- **electron_apps/rocketchat_desktop/notification_system_architecture** - Error notifications

See **global_error_handling_system.md** for implementation details and API signatures.