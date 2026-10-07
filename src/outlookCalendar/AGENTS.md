# Outlook Calendar Module

## Logging

**Log through the helpers in `logger.ts`.** Do not call
`console.log('[OutlookCalendar]...')` directly. The helpers add the prefix and
obey the two logging settings.

```typescript
import {
  outlookLog,
  outlookInfo,
  outlookDebug,
  outlookWarn,
  outlookError,
  outlookEventDetail,
} from './logger';

// These log only when "Verbose Outlook Calendar logging" is on
outlookLog('message', data);
outlookInfo('message', data);
outlookDebug('message', data);
outlookWarn('message', data);

// This ALWAYS logs the message. It logs the extra arguments only in verbose mode.
outlookError('message', data);

// This logs only when "Detailed events logging" is on
outlookEventDetail('full event data', eventObject);
```

### Why This Matters

- Users turn on **Verbose Outlook Calendar logging** and **Detailed events
  logging** in the settings window, Advanced section. The section shows them
  only when Developer Mode is on.
- When verbose logging is off, only errors reach the console.
- Both settings persist across app restarts.

### Architecture

```text
Redux Store (isVerboseOutlookLoggingEnabled, isDetailedEventsLoggingEnabled)
    ↓ watch()
global.isVerboseOutlookLoggingEnabled / global.isDetailedEventsLoggingEnabled
    ↓ checked by
outlookLog() / outlookInfo() / outlookDebug() / outlookWarn() / outlookError()
outlookEventDetail()
```

## Preload Script Limitation

**`preload.ts` cannot use the logging settings.** It runs in the renderer
process, and `global.isVerboseOutlookLoggingEnabled` lives in the main process.

Logs in `preload.ts` always appear. Keep preload logging to a minimum.

## Error Classification

Create each user-facing error with `createClassifiedError()` from
`errorClassification.ts`. The result (`OutlookCalendarError` in `type.ts`)
holds:

- A `source`: `exchange`, `rocket_chat`, `desktop_app`, `network`,
  `authentication` or `configuration`.
- A `severity`: `low`, `medium`, `high` or `critical`.
- A `userMessage` and optional `suggestedActions` for troubleshooting.
- A `technicalMessage` and a structured `context` with a timestamp, for
  debugging.
