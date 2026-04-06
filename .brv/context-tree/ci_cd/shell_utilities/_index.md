---
children_hash: a8d0edfc476130afe2532e1f30233c4215c81acd9f10d5c813f4ebeccbe0a668
compression_ratio: 0.645933014354067
condensation_order: 1
covers: [shell_execution_utilities.md]
covers_token_total: 627
summary_level: d1
token_count: 405
type: summary
---
# Shell Execution Utilities

## Overview
Provides three command execution utilities for GitHub Actions workflows in `workspaces/desktop-release-action/src/shell.ts`, with environment variable merging and output capture capabilities.

## Core Functions

**run(command, env?)** — Direct execution with logging
- Wraps execution in `core.group()` for collapsible Actions logs
- Uses `stdio:inherit` to stream output directly to console
- Rejects on non-zero exit code

**runAndBuffer(command, env?)** — Output capture
- Accumulates stdout chunks into Buffer
- Returns UTF-8 string result
- Rejects on non-zero exit code

**runElectronBuilder(args, env?)** — Electron builder convenience wrapper
- Executes `yarn electron-builder --publish never ${args}`
- Prevents artifact upload (action manages publishing manually)
- Delegates to `run()` internally

## Environment Handling

**mergeEnv(env?)** — Preserves CI environment
- Merges custom env variables on top of `process.env`
- All functions use this for environment setup
- Allows workflow-specific overrides while maintaining CI context

## Key Characteristics

- **Dependencies**: Node.js `child_process.spawn()`, `@actions/core` for GitHub Actions integration
- **Error handling**: All functions reject Promise on non-zero exit codes with error message including `exitCode`
- **Execution model**: Spawned child processes with configurable stdio handling
- **Use cases**: npm/yarn commands, gcloud CLI operations, electron-builder invocations

## Architectural Pattern

Command input → `mergeEnv()` → `spawn()` → stdio handling → exit code validation → resolve/reject