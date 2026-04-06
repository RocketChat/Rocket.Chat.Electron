---
title: Release Asset Upload Patterns
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:59:05.765Z'
updatedAt: '2026-04-04T18:59:05.765Z'
---
## Raw Concept
**Task:**
Document the file patterns and purposes of artifacts uploaded to GitHub releases for each platform

**Changes:**
- Defined Linux artifact patterns
- Defined macOS artifact patterns
- Defined Windows artifact patterns
- Documented YAML manifest files
- Documented blockmap delta update files

**Files:**
- workspaces/desktop-release-action/src/index.ts

**Flow:**
getFilesToUpload() → fast-glob patterns → collects all matching files from dist/ → returns array of paths for upload

## Narrative
### Structure
Assets are organized by platform with shared electron-builder YAML manifests. Each platform has binary installers, update manifests, and delta maps. The glob patterns in getFilesToUpload() define exactly which files to include.

### Highlights
YAML files are electron-builder auto-updater manifests used by electron-updater for checking updates. Blockmap files enable delta updates (binary diffs) for faster downloads. MAS (Mac App Store) packages are in mas-universal/ subdirectory.

### Rules
Rule 1: Linux artifacts: latest-linux.yml (manifest), *.tar.gz (source), *.snap (snap), *.deb (Debian), *.rpm (RedHat), *.AppImage (AppImage)
Rule 2: macOS artifacts: latest-mac.yml (manifest), *.pkg (installer), *.zip (portable), *.dmg (disk image), *.dmg.blockmap (delta map), mas-universal/*.pkg (Mac App Store)
Rule 3: Windows artifacts: latest.yml (manifest), *.appx (Microsoft Store), *.msi (Windows Installer), *.exe (portable), *.exe.blockmap (delta map)
Rule 4: Channel YAMLs: alpha.yml, alpha-mac.yml, alpha-linux.yml, beta.yml, beta-mac.yml, beta-linux.yml
Rule 5: Blockmap files are binary diff maps for delta updates, only generated for dmg and exe formats

### Examples
Complete glob pattern list: dist/latest-linux.yml, dist/*.tar.gz, dist/*.snap, dist/*.deb, dist/*.rpm, dist/latest-mac.yml, dist/*.pkg, dist/*.zip, dist/*.dmg, dist/*.dmg.blockmap, dist/mas-universal/*.pkg, dist/latest.yml, dist/*.appx, dist/*.msi, dist/*.exe, dist/*.exe.blockmap, dist/*.AppImage, dist/alpha.yml, dist/alpha-mac.yml, dist/alpha-linux.yml, dist/beta.yml, dist/beta-mac.yml, dist/beta-linux.yml
