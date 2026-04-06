---
title: Build and Bundling
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:06:23.178Z'
updatedAt: '2026-04-04T18:06:23.178Z'
---
## Raw Concept
**Task:**
Document Rollup-based build pipeline and electron-builder packaging

**Changes:**
- Build process uses Rollup 4 bundler
- Three entry points: main.ts, rootWindow.ts, preload.ts
- electron-builder handles cross-platform packaging

**Files:**
- src/main.ts
- src/rootWindow.ts
- src/preload.ts
- package.json

**Flow:**
Source (src/) -> Rollup bundler -> Build output (app/) -> electron-builder -> Distribution files (dist/)

**Timestamp:** 2026-04-04

## Narrative
### Structure
Build pipeline: Rollup bundles TypeScript source into app/ folder. Three entry files coordinate: main.ts (main process), rootWindow.ts (renderer), preload.ts (IPC bridge). electron-builder packages for target platform. Distribution output to dist/ directory.

### Dependencies
Requires: Node.js >= 24.11.1, Yarn >= 4.0.2. Dependencies vs devDependencies split critical: only dependencies included in distributable.

### Highlights
Rollup configuration handles three separate entry points. electron-builder supports Windows (NSIS/MSI), macOS (DMG/PKG/ZIP), Linux (AppImage/deb/rpm/snap/tar.gz). Build output automatically generated from src/ folder on yarn start.

### Rules
Rule 1: Only modules in dependencies (not devDependencies) included in distributable
Rule 2: src/ folder automatically built on yarn start
Rule 3: app/ folder contains full runnable application after build
Rule 4: dist/ directory contains final distribution packages
