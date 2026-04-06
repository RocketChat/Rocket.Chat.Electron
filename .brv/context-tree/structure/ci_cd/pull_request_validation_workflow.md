---
title: Pull Request Validation Workflow
tags: []
related: [structure/ci_cd/build_release_workflow.md, structure/ci_cd/powershell_linting_workflow.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:48:45.398Z'
updatedAt: '2026-04-04T18:48:45.398Z'
---
## Raw Concept
**Task:**
Standard CI validation workflow for pull requests targeting master and dev branches

**Changes:**
- Validates on 3-OS matrix (ubuntu-latest, macos-latest, windows-latest)
- Runs lint, test, build, and smoke-test steps
- Cancels in-progress runs per head ref to prevent duplicates

**Files:**
- .github/workflows/validate-pr.yml

**Flow:**
PR event -> cancel-in-progress -> checkout -> setup Node 24.11.1 -> cache -> yarn install -> lint -> test -> build (NODE_ENV=production) -> build uncompressed dist -> smoke-test executables

**Timestamp:** 2026-04-04

## Narrative
### Structure
Single job "check" with fail-fast: false on 3-OS matrix. Runs on ubuntu-latest, macos-latest, windows-latest. Uses actions/checkout@v3, actions/setup-node@v4, actions/cache@v4.

### Dependencies
Requires Node.js 24.11.1, yarn, git, platform-specific tools (xvfb on Linux, coreutils on macOS, PowerShell on Windows). Caches node_modules by runner.os + yarn.lock hash.

### Highlights
Smoke-tests built binaries with 30-second timeout. Linux: ./dist/linux-unpacked/rocketchat-desktop. macOS: both mac and mac-arm64 app bundles. Windows: both win-unpacked and win-ia32-unpacked executables via PowerShell Start-Job.

### Rules
Rule 1: Disable git autocrlf before checkout
Rule 2: Use fail-fast: false to allow all matrix jobs to complete
Rule 3: NODE_ENV=production for app build step
Rule 4: Linux/macOS use yarn electron-builder --dir; Windows uses --x64 --ia32 --dir (no arm64 uncompressed)
Rule 5: Smoke tests timeout at 30 seconds per executable
Rule 6: Permissions: contents read-only (no secrets used)

### Examples
Linux smoke test: xvfb-run timeout 30 ./dist/linux-unpacked/rocketchat-desktop --no-sandbox
Windows smoke test: Start-Job -ScriptBlock { .\dist\win-unpacked\Rocket.Chat.exe } with 30s Wait-Job timeout

## Facts
- **pr_validation_workflow**: validate-pr.yml is the standard CI validation workflow for pull requests [project]
- **pr_trigger_branches**: Triggers on pull_request events targeting master or dev branches [convention]
- **ci_matrix_platforms**: Uses 3-OS matrix: ubuntu-latest, macos-latest, windows-latest [project]
- **node_version**: Node.js version: 24.11.1 [project]
- **ci_concurrency_policy**: Concurrency: cancel-in-progress per head ref to prevent duplicate runs [convention]
- **workflow_permissions**: Permissions: contents read-only (no write access) [project]
- **ci_fail_fast_policy**: fail-fast: false allows all matrix jobs to complete even if one fails [convention]
- **workflow_steps**: Steps: disable git autocrlf, checkout, setup Node, cache, yarn install, lint, test, build, smoke-test executables [project]
- **build_environment**: Build target: NODE_ENV=production for app build [convention]
- **builder_platform_variants**: Linux/macOS: yarn electron-builder --dir (uncompressed); Windows: --x64 --ia32 --dir (no arm64 uncompressed) [project]
- **smoke_test_timeout**: Smoke tests: 30-second timeout per executable launch on all platforms [convention]
- **macos_build_variants**: macOS smoke test runs both mac and mac-arm64 app bundles [project]
- **windows_test_method**: Windows smoke test uses PowerShell Start-Job with Wait-Job for both x64 and ia32 executables [project]
