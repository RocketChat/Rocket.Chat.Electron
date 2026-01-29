# Logging System Professional Upgrade Plan

## TL;DR

> **Quick Summary**: Upgrade the logging collector system to match industry best practices (VS Code, Slack, Discord level). Addresses privacy, performance, reliability, and maintainability gaps.
>
> **Deliverables**:
>
> - Privacy hooks to filter sensitive data (tokens, passwords, URLs)
> - Log file cleanup and retention policies (30-day auto-delete)
> - Fix memory leaks in server context tracking
> - Replace fragile stack-trace detection with explicit scoped loggers
> - Add structured logging option for error reporting integration
> - Improve error handling throughout logging system
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Privacy hooks → Scoped loggers → Cleanup & polish

---

## Context

### Current State Assessment

**Strengths** (Already Good):

- Uses electron-log (industry standard)
- Multi-process aggregation works (main, renderer, webview)
- Context-aware logging captures process type
- Privacy-safe anonymous server IDs
- Standard log format with timestamps
- Platform-appropriate log file locations

**Gaps** (vs VS Code/Slack/Discord):

| Gap                           | Severity | Impact                                 |
| ----------------------------- | -------- | -------------------------------------- |
| No privacy hooks              | HIGH     | Tokens/passwords can leak to log files |
| Server counter memory leak    | MEDIUM   | Memory grows in long sessions          |
| Fragile stack-trace detection | MEDIUM   | Breaks with minification/refactoring   |
| Silent logging failures       | MEDIUM   | Critical errors could be lost          |
| No log file cleanup           | LOW      | Disk space accumulation                |
| No scoped loggers             | LOW      | Inconsistent context strings           |
| No structured logging         | LOW      | Harder error reporting integration     |

### Industry Reference

| App      | Logging Approach | Key Features                              |
| -------- | ---------------- | ----------------------------------------- |
| VS Code  | spdlog + custom  | 5MB×6 rotation, scoped loggers, telemetry |
| Slack    | electron-log     | Process isolation, custom IPC             |
| Discord  | Custom           | Structured JSON, remote reporting         |
| Insomnia | electron-log     | Privacy hooks, 10MB rotation              |

---

## Work Objectives

### Core Objective

Bring the logging system to professional quality matching top-tier Electron applications.

### Concrete Deliverables

- `src/logging/privacy.ts` - Privacy hook utilities
- `src/logging/scopes.ts` - Scoped logger factory
- `src/logging/cleanup.ts` - Log file retention manager
- Updated `src/logging/index.ts` with all improvements
- Updated `src/logging/context.ts` with memory leak fix

### Definition of Done

- [ ] Sensitive data (tokens, passwords, emails) never appears in log files
- [ ] Log files auto-delete after 30 days
- [ ] Server context memory properly cleaned up
- [ ] Logging failures are themselves logged (meta-logging)
- [ ] `yarn lint` passes
- [ ] `yarn test` passes

### Must Have

- Privacy hooks for sensitive data filtering
- Memory leak fix in server counter
- Logging failure fallback
- Log file cleanup on app startup

### Must NOT Have (Guardrails)

- Breaking changes to existing log format
- New external dependencies (stick with electron-log)
- Performance regression (logging should be <1ms)
- Removal of existing context features

---

## Verification Strategy

### Test Decision

- **Infrastructure exists**: YES (Jest)
- **User wants tests**: YES - unit tests for privacy filtering
- **Framework**: Jest

### Automated Verification

- Unit tests for privacy hook patterns
- Integration test for log file cleanup
- `yarn lint` passes
- Manual verification of log output format

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Critical - Privacy & Memory):
├── Task 1: Add privacy hooks for sensitive data filtering
├── Task 2: Fix server counter memory leak
└── Task 3: Add logging failure fallback

Wave 2 (Architecture - Scoped Loggers):
├── Task 4: Create scoped logger factory
├── Task 5: Migrate from stack-trace to explicit scopes
└── Task 6: Add structured logging option

Wave 3 (Polish - Cleanup & Docs):
├── Task 7: Add log file cleanup on startup
├── Task 8: Add retention policy configuration
└── Task 9: Add runtime log level control
```

### Dependency Matrix

| Task | Depends On | Blocks | Parallelize With |
| ---- | ---------- | ------ | ---------------- |
| 1    | None       | 6      | 2, 3             |
| 2    | None       | None   | 1, 3             |
| 3    | None       | None   | 1, 2             |
| 4    | None       | 5      | None             |
| 5    | 4          | None   | 6                |
| 6    | 1          | None   | 5                |
| 7    | None       | 8      | None             |
| 8    | 7          | None   | 9                |
| 9    | None       | None   | 8                |

---

## TODOs

### Wave 1: Critical Security & Reliability

- [ ] 1. Add Privacy Hooks for Sensitive Data Filtering

  **What to do**:

  - Create `src/logging/privacy.ts` with privacy filtering utilities
  - Add hook to electron-log that filters sensitive patterns before writing
  - Patterns to filter: tokens, passwords, API keys, email addresses, authorization headers

  **Implementation**:

  ```typescript
  // src/logging/privacy.ts

  /**
   * Patterns that indicate sensitive data
   * These will be redacted from logs
   */
  const SENSITIVE_PATTERNS = [
    /password["\s:=]+["']?[^"'\s,}]+/gi,
    /token["\s:=]+["']?[^"'\s,}]+/gi,
    /api[_-]?key["\s:=]+["']?[^"'\s,}]+/gi,
    /secret["\s:=]+["']?[^"'\s,}]+/gi,
    /bearer\s+[a-zA-Z0-9._-]+/gi,
    /authorization["\s:=]+["']?[^"'\s,}]+/gi,
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // emails
  ];

  /**
   * Redact sensitive data from a string
   */
  export const redactSensitiveData = (text: string): string => {
    let result = text;
    for (const pattern of SENSITIVE_PATTERNS) {
      result = result.replace(pattern, '[REDACTED]');
    }
    return result;
  };

  /**
   * Privacy hook for electron-log
   * Filters sensitive data before writing to file
   */
  export const privacyHook = (
    message: any,
    transport: any,
    transportName: string
  ) => {
    // Only filter for file transport (console is ok in dev)
    if (transportName !== 'file') {
      return message;
    }

    // Redact sensitive data from all message parts
    const sanitizedData = message.data.map((item: any) => {
      if (typeof item === 'string') {
        return redactSensitiveData(item);
      }
      if (typeof item === 'object' && item !== null) {
        return JSON.parse(redactSensitiveData(JSON.stringify(item)));
      }
      return item;
    });

    return { ...message, data: sanitizedData };
  };
  ```

  **Integration in index.ts**:

  ```typescript
  import { privacyHook } from './privacy';

  // Add hook to electron-log
  log.hooks.push(privacyHook);
  ```

  **References**:

  - `src/logging/index.ts` - Main logging configuration
  - electron-log hooks documentation
  - VS Code sensitive data handling patterns

  **Acceptance Criteria**:

  - [ ] Privacy hook filters tokens, passwords, API keys
  - [ ] Email addresses are redacted
  - [ ] Authorization headers are filtered
  - [ ] Unit tests pass for all patterns
  - [ ] `yarn lint` passes

  **Commit**: YES

  - Message: `security(logging): add privacy hooks to filter sensitive data`
  - Files: `src/logging/privacy.ts`, `src/logging/index.ts`

---

- [ ] 2. Fix Server Counter Memory Leak

  **What to do**:

  - Modify `src/logging/context.ts` to properly recycle server IDs
  - When a webContents is destroyed, its server ID should become available for reuse
  - Add maximum server ID cap to prevent unbounded growth

  **Implementation**:

  ```typescript
  // Replace simple counter with ID pool
  const MAX_SERVER_ID = 100;
  const availableServerIds: number[] = Array.from(
    { length: MAX_SERVER_ID },
    (_, i) => i + 1
  );
  const usedServerIds = new Map<number, number>(); // webContentsId -> serverId

  export const getServerContext = (webContents?: WebContents): string => {
    if (!webContents) return 'local';

    const webContentsId = webContents.id;

    // Check existing mapping
    if (usedServerIds.has(webContentsId)) {
      return `server-${usedServerIds.get(webContentsId)}`;
    }

    // For main window
    if (webContents.getType() === 'window') {
      return 'local';
    }

    // For webviews, assign from pool
    if (webContents.getType() === 'webview') {
      const serverId = availableServerIds.shift() || usedServerIds.size + 1;
      usedServerIds.set(webContentsId, serverId);
      return `server-${serverId}`;
    }

    return 'unknown';
  };

  export const cleanupServerContext = (webContentsId: number): void => {
    const serverId = usedServerIds.get(webContentsId);
    if (serverId !== undefined) {
      usedServerIds.delete(webContentsId);
      // Return ID to pool for reuse
      if (serverId <= MAX_SERVER_ID && !availableServerIds.includes(serverId)) {
        availableServerIds.push(serverId);
        availableServerIds.sort((a, b) => a - b); // Keep sorted for consistent assignment
      }
    }
    serverContextMap.delete(webContentsId);
  };
  ```

  **References**:

  - `src/logging/context.ts:8` - Current counter
  - `src/logging/context.ts:61-91` - getServerContext function
  - `src/logging/context.ts:233-235` - cleanupServerContext function

  **Acceptance Criteria**:

  - [ ] Server IDs are recycled when webContents destroyed
  - [ ] Maximum of 100 concurrent server IDs
  - [ ] Memory usage doesn't grow with connect/disconnect cycles
  - [ ] `yarn lint` passes

  **Commit**: YES

  - Message: `fix(logging): recycle server IDs to prevent memory leak`
  - Files: `src/logging/context.ts`

---

- [ ] 3. Add Logging Failure Fallback

  **What to do**:

  - Wrap logging operations in try-catch with fallback
  - Log logging failures to a separate error stream
  - Never silently swallow logging errors

  **Implementation**:

  ```typescript
  // src/logging/fallback.ts

  /**
   * Fallback logger that writes directly to stderr
   * Used when main logging system fails
   */
  export const fallbackLog = (level: string, ...args: any[]): void => {
    const timestamp = new Date().toISOString();
    const message = args
      .map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a)))
      .join(' ');

    // Write directly to stderr (always available)
    process.stderr.write(`[${timestamp}] [${level}] [FALLBACK] ${message}\n`);
  };

  /**
   * Safe logging wrapper that falls back on errors
   */
  export const safeLog = (
    logFn: (...args: any[]) => void,
    level: string,
    ...args: any[]
  ): void => {
    try {
      logFn(...args);
    } catch (error) {
      fallbackLog('error', `Logging failed: ${error}`);
      fallbackLog(level, ...args);
    }
  };
  ```

  **References**:

  - `src/logging/index.ts:62-66` - Current silent catch
  - `src/logging/index.ts:230-232` - Another silent catch

  **Acceptance Criteria**:

  - [ ] Logging failures are themselves logged to stderr
  - [ ] Original log message is still captured via fallback
  - [ ] No silent error swallowing
  - [ ] `yarn lint` passes

  **Commit**: YES

  - Message: `fix(logging): add fallback for logging failures`
  - Files: `src/logging/fallback.ts`, `src/logging/index.ts`

---

### Wave 2: Architecture Improvements

- [ ] 4. Create Scoped Logger Factory

  **What to do**:

  - Create `src/logging/scopes.ts` with a factory for creating scoped loggers
  - Each scope has a name that appears in log output
  - Replaces fragile stack-trace based detection

  **Implementation**:

  ```typescript
  // src/logging/scopes.ts
  import log from 'electron-log';

  export interface ScopedLogger {
    debug: (...args: any[]) => void;
    info: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
  }

  /**
   * Create a scoped logger with a consistent prefix
   *
   * @example
   * const logger = createScopedLogger('outlook');
   * logger.info('Sync started'); // [main] [outlook] Sync started
   */
  export const createScopedLogger = (scope: string): ScopedLogger => {
    const scopeStr = `[${scope}]`;

    return {
      debug: (...args) => log.debug(scopeStr, ...args),
      info: (...args) => log.info(scopeStr, ...args),
      warn: (...args) => log.warn(scopeStr, ...args),
      error: (...args) => log.error(scopeStr, ...args),
    };
  };

  // Pre-defined scopes for common modules
  export const loggers = {
    main: createScopedLogger('main'),
    app: createScopedLogger('app'),
    outlook: createScopedLogger('outlook'),
    auth: createScopedLogger('auth'),
    ipc: createScopedLogger('ipc'),
    ui: createScopedLogger('ui'),
    updates: createScopedLogger('updates'),
    notifications: createScopedLogger('notifications'),
    videoCall: createScopedLogger('videocall'),
    servers: createScopedLogger('servers'),
  };
  ```

  **References**:

  - VS Code's `ILogger.scope()` pattern
  - electron-log's `log.scope()` built-in feature
  - `src/logging/context.ts:97-181` - Current stack-trace detection to replace

  **Acceptance Criteria**:

  - [ ] `createScopedLogger` function works correctly
  - [ ] Pre-defined loggers for common modules
  - [ ] Log output includes scope in brackets
  - [ ] `yarn lint` passes

  **Commit**: YES

  - Message: `feat(logging): add scoped logger factory`
  - Files: `src/logging/scopes.ts`, `src/logging/index.ts`

---

- [ ] 5. Migrate from Stack-Trace to Explicit Scopes

  **What to do**:

  - Update key modules to use scoped loggers instead of console.log
  - Keep stack-trace detection as fallback for unmigrated code
  - Document migration path for other modules

  **Key modules to migrate**:

  - `src/outlookCalendar/ipc.ts` → use `loggers.outlook`
  - `src/videoCallWindow/ipc.ts` → use `loggers.videoCall`
  - `src/updates/main.ts` → use `loggers.updates`

  **Example migration**:

  ```typescript
  // Before (in outlookCalendar/ipc.ts):
  console.log('[OutlookCalendar] Sync started');

  // After:
  import { loggers } from '../logging/scopes';
  loggers.outlook.info('Sync started');
  ```

  **References**:

  - `src/outlookCalendar/ipc.ts` - Heavy console.log usage
  - `src/videoCallWindow/ipc.ts` - Heavy console.log usage
  - `src/logging/context.ts:97-181` - Stack-trace patterns as guide

  **Acceptance Criteria**:

  - [ ] outlookCalendar uses scoped logger
  - [ ] videoCallWindow uses scoped logger
  - [ ] updates uses scoped logger
  - [ ] Log output is consistent
  - [ ] `yarn lint` passes

  **Commit**: YES

  - Message: `refactor(logging): migrate key modules to scoped loggers`
  - Files: `src/outlookCalendar/ipc.ts`, `src/videoCallWindow/ipc.ts`, `src/updates/main.ts`

---

- [ ] 6. Add Structured Logging Option

  **What to do**:

  - Add a JSON transport for structured logging
  - Enable for error-level logs (future Sentry/error reporting integration)
  - Keep plain text as primary format

  **Implementation**:

  ```typescript
  // In index.ts, add structured logging transport

  // Create structured log file for errors only
  log.transports.file2 = new log.transports.File({
    fileName: 'errors.json',
    level: 'error',
    format: (message) => {
      return JSON.stringify({
        timestamp: message.date.toISOString(),
        level: message.level,
        data: message.data,
        scope: message.scope,
        processType: process.type,
        version: app.getVersion(),
      });
    },
  });
  ```

  **References**:

  - electron-log custom transports documentation
  - VS Code telemetry patterns
  - Sentry Electron integration

  **Acceptance Criteria**:

  - [ ] `errors.json` file created with JSON format
  - [ ] Only error-level logs in JSON file
  - [ ] JSON includes timestamp, level, message, version
  - [ ] `yarn lint` passes

  **Commit**: YES

  - Message: `feat(logging): add structured JSON logging for errors`
  - Files: `src/logging/index.ts`

---

### Wave 3: Polish & Maintenance

- [ ] 7. Add Log File Cleanup on Startup

  **What to do**:

  - Create `src/logging/cleanup.ts` with cleanup utilities
  - Delete log files older than retention period
  - Run cleanup on app startup

  **Implementation**:

  ```typescript
  // src/logging/cleanup.ts
  import fs from 'fs';
  import path from 'path';
  import { app } from 'electron';

  const DEFAULT_RETENTION_DAYS = 30;

  /**
   * Clean up old log files based on retention policy
   */
  export const cleanupOldLogs = (
    retentionDays = DEFAULT_RETENTION_DAYS
  ): void => {
    try {
      const logsPath = app.getPath('logs');
      const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

      if (!fs.existsSync(logsPath)) return;

      const files = fs.readdirSync(logsPath);
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(logsPath, file);
        try {
          const stats = fs.statSync(filePath);
          if (stats.mtime.getTime() < cutoffTime) {
            fs.unlinkSync(filePath);
            deletedCount++;
          }
        } catch (error) {
          // Skip files we can't access
        }
      }

      if (deletedCount > 0) {
        console.info(`[logging] Cleaned up ${deletedCount} old log files`);
      }
    } catch (error) {
      console.warn('[logging] Failed to cleanup old logs:', error);
    }
  };
  ```

  **Integration in main.ts**:

  ```typescript
  import { cleanupOldLogs } from './logging/cleanup';

  // Run on app ready
  app.on('ready', () => {
    cleanupOldLogs();
    // ... rest of initialization
  });
  ```

  **References**:

  - `src/main.ts` - App initialization
  - electron-log file paths
  - VS Code log retention patterns

  **Acceptance Criteria**:

  - [ ] Cleanup function deletes files older than 30 days
  - [ ] Runs automatically on app startup
  - [ ] Handles errors gracefully
  - [ ] `yarn lint` passes

  **Commit**: YES

  - Message: `feat(logging): add automatic log file cleanup`
  - Files: `src/logging/cleanup.ts`, `src/main.ts`

---

- [ ] 8. Add Retention Policy Configuration

  **What to do**:

  - Add logging configuration to app settings
  - Allow users to configure retention days
  - Expose in settings UI (optional)

  **Implementation**:

  ```typescript
  // Add to persistable values / settings
  interface LoggingSettings {
    retentionDays: number;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  }

  const DEFAULT_LOGGING_SETTINGS: LoggingSettings = {
    retentionDays: 30,
    logLevel: 'info',
  };
  ```

  **References**:

  - `src/store/rootReducer.ts` - Settings storage
  - `src/ui/components/SettingsView/` - Settings UI

  **Acceptance Criteria**:

  - [ ] Retention days configurable (default 30)
  - [ ] Log level configurable
  - [ ] Settings persisted to store
  - [ ] `yarn lint` passes

  **Commit**: YES

  - Message: `feat(logging): add configurable retention policy`
  - Files: `src/logging/cleanup.ts`, `src/store/rootReducer.ts`

---

- [ ] 9. Add Runtime Log Level Control

  **What to do**:

  - Add IPC handler to change log level at runtime
  - Useful for debugging without restart
  - Expose in developer menu

  **Implementation**:

  ```typescript
  // In logging/index.ts
  export const setLogLevel = (
    level: 'debug' | 'info' | 'warn' | 'error'
  ): void => {
    log.transports.console.level = level;
    log.transports.file.level = level;
    console.info(`[logging] Log level changed to: ${level}`);
  };

  // IPC handler
  handle('logging/set-level', async (_, level) => {
    setLogLevel(level);
    return { success: true };
  });
  ```

  **References**:

  - `src/ipc/channels.ts` - IPC channel definitions
  - VS Code's `ILogger.setLevel()` pattern

  **Acceptance Criteria**:

  - [ ] IPC handler to change log level
  - [ ] Console and file transports updated
  - [ ] Changes take effect immediately
  - [ ] `yarn lint` passes

  **Commit**: YES

  - Message: `feat(logging): add runtime log level control`
  - Files: `src/logging/index.ts`, `src/ipc/channels.ts`

---

## Commit Strategy

| After Task | Message                                 | Files                       | Verification |
| ---------- | --------------------------------------- | --------------------------- | ------------ |
| 1          | `security(logging): add privacy hooks`  | privacy.ts, index.ts        | yarn lint    |
| 2          | `fix(logging): recycle server IDs`      | context.ts                  | yarn lint    |
| 3          | `fix(logging): add fallback`            | fallback.ts, index.ts       | yarn lint    |
| 4          | `feat(logging): add scoped loggers`     | scopes.ts, index.ts         | yarn lint    |
| 5          | `refactor(logging): migrate to scopes`  | outlook, videocall, updates | yarn lint    |
| 6          | `feat(logging): add JSON errors`        | index.ts                    | yarn lint    |
| 7          | `feat(logging): add cleanup`            | cleanup.ts, main.ts         | yarn lint    |
| 8          | `feat(logging): configurable retention` | cleanup.ts, reducer         | yarn lint    |
| 9          | `feat(logging): runtime level control`  | index.ts, channels.ts       | yarn lint    |

---

## Success Criteria

### Verification Commands

```bash
yarn lint       # Expected: 0 errors
yarn test       # Expected: All tests pass
yarn build      # Expected: Build succeeds
```

### Final Checklist

- [ ] All 9 tasks completed
- [ ] Sensitive data never in log files (verified with test)
- [ ] Server IDs properly recycled
- [ ] Logging failures captured via fallback
- [ ] Key modules use scoped loggers
- [ ] Log files auto-cleaned after 30 days
- [ ] Runtime log level control works

---

## Issue Severity Summary

| Severity | Count | Tasks                            |
| -------- | ----- | -------------------------------- |
| HIGH     | 1     | Task 1 (Privacy)                 |
| MEDIUM   | 2     | Tasks 2, 3 (Memory, Fallback)    |
| LOW      | 6     | Tasks 4-9 (Architecture, Polish) |

**Total: 9 tasks across 3 waves**
