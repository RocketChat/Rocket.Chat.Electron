# Outlook Calendar Module

## Logging

**Always use the centralized logger from `logger.ts`** - never use `console.log('[OutlookCalendar]...')` directly.

```typescript
import { outlookLog, outlookDebug, outlookError, outlookWarn, outlookEventDetail } from './logger';

// These respect the verbose logging toggle in Settings > Developer
outlookLog('message', data); // Only logs when verbose enabled
outlookWarn('message', data); // Only logs when verbose enabled
outlookDebug('message', data); // Only logs when verbose enabled

// This ALWAYS logs (errors should always be visible)
outlookError('message', data);

// This respects the detailed events logging toggle in Settings > Developer
outlookEventDetail('full event data', eventObject); // Only logs when detailed events enabled
```

### Why This Matters

- Users can toggle verbose logging in Settings > Developer > Verbose Outlook Logging
- Without verbose mode, only errors are logged (cleaner console)
- The toggle persists across app restarts

### Architecture

```text
Redux Store (isVerboseOutlookLoggingEnabled)
    ↓ watch()
global.isVerboseOutlookLoggingEnabled
    ↓ checked by
outlookLog() / outlookWarn() / outlookDebug()
```

## Preload Script Limitation

**`preload.ts` cannot use the verbose logging toggle** - it runs in the renderer process and doesn't share the `global.isVerboseOutlookLoggingEnabled` variable with the main process.

Logs in `preload.ts` always appear. Keep preload logging minimal.

## Error Classification

Use `createClassifiedError()` from `errorClassification.ts` for user-facing errors. It provides:

- Error categorization (network, auth, exchange, unknown)
- User-friendly messages with troubleshooting steps
- Structured error context for debugging
