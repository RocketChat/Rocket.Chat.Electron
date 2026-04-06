---
title: YAML Checksum Update Post-Signing
tags: []
related: [ci_cd/windows_signing/windows_signing_pipeline.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:50:39.996Z'
updatedAt: '2026-04-04T18:50:39.996Z'
---
## Raw Concept
**Task:**
Update latest.yml checksums after Windows package signing

**Changes:**
- Recalculate SHA512 checksums after signature is added
- Update file sizes in latest.yml
- Ensure auto-updater can verify signed packages

**Files:**
- workspaces/desktop-release-action/src/windows/update-yaml-checksums.ts

**Flow:**
Windows packages signed -> Binary content changes -> Checksums invalidated -> Read latest.yml -> Recalculate SHA512 and sizes -> Write updated YAML -> Auto-updater can verify

**Timestamp:** 2026-04-04

**Patterns:**
- `^[A-Za-z0-9+/]+=*$` - Base64 encoded SHA512 checksum format

## Narrative
### Structure
Post-signing checksum update in src/windows/update-yaml-checksums.ts. Exports updateWindowsYamlChecksums(distPath) and updateYamlChecksums(distPath) functions.

### Dependencies
Requires: js-yaml for YAML parsing, crypto module for SHA512 calculation, fs and path modules for file I/O. Called by src/windows/index.ts.

### Highlights
Critical for auto-update verification. Handles missing files gracefully with warnings. Preserves YAML formatting with single quotes and no line wrapping.

### Rules
Rule 1: Calculate SHA512 as base64 digest
Rule 2: Update both individual file checksums and main installer checksum
Rule 3: Skip files that do not exist with warning
Rule 4: Write updated YAML with consistent formatting

### Examples
YamlFile interface: {url, sha512 (base64), size}. LatestYaml interface: {version, files[], path, sha512, releaseDate}. Log format: "Updating {filename}: Old SHA512: ... New SHA512: ..."
