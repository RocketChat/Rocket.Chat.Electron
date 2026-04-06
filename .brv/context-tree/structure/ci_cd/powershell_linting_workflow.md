---
title: PowerShell Linting Workflow
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:46:57.354Z'
updatedAt: '2026-04-04T18:46:57.354Z'
---
## Raw Concept
**Task:**
Automated PowerShell script linting via GitHub Actions workflow

**Changes:**
- Configured PSScriptAnalyzer for recursive linting
- Excluded PSAvoidUsingWriteHost rule (Write-Host acceptable for CI output)
- Triggered on PowerShell file changes and workflow modifications

**Files:**
- .github/workflows/powershell-lint.yml

**Flow:**
PR or push to master/dev -> path filter checks for .ps1/.psm1/.psd1 changes -> windows-latest runner -> checkout -> install PSScriptAnalyzer -> run Invoke-ScriptAnalyzer -> fail on issues

**Timestamp:** 2026-04-04

## Narrative
### Structure
Single-job GitHub Actions workflow running on windows-latest. Installs PSScriptAnalyzer from PSGallery with trusted repository policy, then executes recursive analysis across the entire repository.

### Dependencies
Requires PSScriptAnalyzer PowerShell module from PSGallery. Runs on Windows runner to support PowerShell cmdlets.

### Highlights
Workflow is path-filtered to only trigger when PowerShell files (.ps1, .psm1, .psd1) or the workflow file itself changes. Intentionally excludes PSAvoidUsingWriteHost rule since Write-Host is useful for CI output logging.

### Rules
Rule 1: Set PSGallery repository as Trusted before installing modules
Rule 2: Run Invoke-ScriptAnalyzer with -Recurse flag to scan entire repository
Rule 3: Exit with code 1 if any linting issues are found
Rule 4: Exclude PSAvoidUsingWriteHost from analysis rules

### Examples
Example output: If issues found, displays results in table format via Format-Table -AutoSize, then writes error message and exits with failure status.

## Facts
- **trigger_pr**: Workflow triggers on pull_request to any branch [convention]
- **trigger_push_branches**: Workflow triggers on push to master and dev branches [convention]
- **runner_platform**: Runner platform is windows-latest [project]
- **linter_source**: PSScriptAnalyzer is installed from PSGallery [project]
- **excluded_rule**: Excluded rule is PSAvoidUsingWriteHost [convention]
- **permissions**: Permissions required: contents: read [project]
