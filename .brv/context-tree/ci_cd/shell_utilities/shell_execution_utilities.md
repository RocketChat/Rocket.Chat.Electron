---
title: Shell Execution Utilities
tags: []
keywords: []
importance: 60
recency: 1
maturity: draft
updateCount: 2
createdAt: '2026-04-04T18:50:42.817Z'
updatedAt: '2026-04-04T18:55:26.993Z'
---
## Raw Concept
**Task:**
Provide shell command execution utilities for GitHub Actions workflows with environment variable merging and output capture

**Files:**
- workspaces/desktop-release-action/src/shell.ts

**Flow:**
Command input -> mergeEnv() -> spawn() -> stdio handling -> exit code check -> resolve/reject

**Timestamp:** 2026-04-04

## Narrative
### Structure
Three main exported functions in src/shell.ts: run() for direct execution with logging, runAndBuffer() for output capture, and runElectronBuilder() as a convenience wrapper. All use mergeEnv() to preserve CI environment variables while allowing custom overrides.

### Dependencies
Depends on Node.js child_process.spawn() for shell command execution and @actions/core for GitHub Actions integration (core.group for collapsible log sections).

### Highlights
Key features: run() wraps execution in core.group() for collapsible Actions logs; runAndBuffer() captures stdout into Buffer and returns UTF-8 string; runElectronBuilder() prevents electron-builder from uploading artifacts (--publish never) since the action manages publishing manually; all functions reject on non-zero exit codes.

### Rules
Rule 1: mergeEnv() preserves all process.env variables and merges custom env on top
Rule 2: run() uses stdio:inherit to stream output directly to console
Rule 3: runAndBuffer() accumulates stdout chunks and converts to UTF-8 string
Rule 4: runElectronBuilder() always appends --publish never to prevent double-upload
Rule 5: All functions reject Promise on non-zero exit code with error message including exitCode

### Examples
Example usage: run("npm install") executes with inherited stdio; runAndBuffer("gcloud config get-value project") captures project ID; runElectronBuilder("--win --publish never") runs yarn electron-builder with platform-specific args

---

export const run = (command: string, env?: Record<string, string>): Promise<void>

---

export const runAndBuffer = (command: string, env?: Record<string, string>): Promise<string>

---

export const runElectronBuilder = (args: string, env?: Record<string, string>): Promise<void> => run(`yarn electron-builder --publish never ${args}`, env);

---

const mergeEnv = (env?: Record<string, string>) => {
  if (!env) return undefined;
  return { ...process.env, ...env };
};
