---
title: GitHub Release Asset Upload Patterns by Platform
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:51:01.103Z'
updatedAt: '2026-04-04T18:51:01.103Z'
---
## Raw Concept
**Task:**
Document the complete file upload patterns for each platform in desktop release action

**Changes:**
- Linux uploads: latest-linux.yml, *.tar.gz, *.snap, *.deb, *.rpm, *.AppImage
- macOS uploads: latest-mac.yml, *.pkg, *.zip, *.dmg, *.dmg.blockmap, mas-universal/*.pkg
- Windows uploads: latest.yml, *.appx, *.msi, *.exe, *.exe.blockmap
- All platforms upload alpha/beta channel YAMLs: alpha.yml, alpha-mac.yml, alpha-linux.yml, beta.yml, beta-mac.yml, beta-linux.yml

**Files:**
- workspaces/desktop-release-action/src/index.ts

**Flow:**
getFilesToUpload() glob patterns -> basename extraction -> stat file for size -> readFile for data -> overrideAsset to GitHub

**Timestamp:** 2026-04-04

## Narrative
### Structure
The getFilesToUpload() function uses fast-glob to discover files matching platform-specific patterns in the dist/ directory. YAML files are electron-builder auto-updater manifests. Blockmap files are binary diff maps for delta updates. Each file is read entirely into memory before upload via overrideAsset(). Files are discovered from whichever platform runner the action executes on, but all three runners upload to the same GitHub release.

### Dependencies
Uses fast-glob (fg) for file pattern matching. Uses Node.js fs.promises for file stat and readFile operations. Uses basename() and extname() from path module for file metadata extraction.

### Highlights
All three platform runners upload to the same GitHub release, enabling parallel cross-platform builds. YAML manifest files enable electron-updater to detect and download updates. Blockmap files enable delta updates for faster downloads. AppX files for Microsoft Store are included but NOT signed by the action.

### Examples
Example getFilesToUpload() call: fg([...patterns...]) returns array of file paths like "dist/Rocket.Chat-1.0.0.dmg", "dist/latest-mac.yml", etc. Each file is read with promises.readFile(path), stat with promises.stat(path) for size metadata, then uploaded with overrideAsset(release, assets, name, size, data).
