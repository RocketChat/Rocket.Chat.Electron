---
title: Asset Generation Pipeline
tags: []
related: [electron_apps/rocketchat_desktop/build_system/build_and_bundling.md, electron_apps/rocketchat_desktop/ui_components/public_assets_structure.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:47:12.042Z'
updatedAt: '2026-04-04T18:47:12.042Z'
---
## Raw Concept
**Task:**
Generate platform-specific application icons and installer assets from React SVG components

**Changes:**
- Renders React SVG components to PNG using Puppeteer
- Converts PNG to platform-specific formats (ICNS, ICO, BMP)
- Generates app icons, tray icons, DMG backgrounds, and NSIS sidebars
- Creates badge variants for notification indicators (dot, 1-9, plus-9)

**Files:**
- src/buildAssets.ts
- src/ui/icons/AppIcon.tsx
- src/ui/icons/MacOSAppIcon.tsx
- src/ui/icons/MacOSTrayIcon.tsx
- src/ui/icons/WindowsTrayIcon.tsx
- src/ui/icons/LinuxTrayIcon.tsx
- src/ui/assets/DmgBackground.tsx
- src/ui/assets/NsisSideBar.tsx

**Flow:**
React SVG component -> Puppeteer render to PNG -> Format conversion (ICNS/ICO/BMP) -> Write to build/public directories

**Timestamp:** 2026-04-04

**Patterns:**
- `build/icon\.(icns|ico)` - App icon output files for macOS and Windows
- `src/public/images/tray/(darwin|win32|linux)/` - Platform-specific tray icon directories
- `notification-[a-z0-9\-]+\.(ico|png)` - Badge variant tray icon naming pattern

## Narrative
### Structure
buildAssets.ts is a standalone script (executed via `node -r ts-node/register src/buildAssets.ts`, not part of Rollup bundle). It contains 8 main functions: convertSvgToPng() (core Puppeteer renderer), writeFile() (file writer), and 7 platform-specific generators. The run() function orchestrates the pipeline: creates app icons (macOS/Windows/Linux), clears tray directory, creates tray icons (macOS/Windows/Linux), then DMG backgrounds and NSIS sidebars.

### Dependencies
Requires: puppeteer (browser automation), @fiahfy/icns-convert (PNG→ICNS), @fiahfy/ico-convert (PNG→ICO), jimp (image processing for BMP), react (JSX rendering), react-dom/server (renderToStaticMarkup), rimraf (directory cleanup). Icon components imported from src/ui/icons/ and src/ui/assets/.

### Highlights
Supports 3 badge variants per platform: dot indicator (•), numeric 1-9, and plus-9 (>9). macOS uses retina @2x variants (24px and 48px for tray). Windows/Linux generate 11 notification badge variants each. DMG backgrounds include retina support (600x422 and 1200x844). NSIS sidebar is 164x314px converted to BMP.

### Rules
Rule 1: convertSvgToPng() launches fresh Puppeteer browser for each render (launches and closes browser per call)
Rule 2: All platform tray icon directories are cleared before regeneration (rimraf src/public/images/tray)
Rule 3: Badge naming: dot=• character, 1-9=numeric string, >9=plus-9
Rule 4: macOS tray icons use Template suffix (defaultTemplate, notificationTemplate) for system appearance support

### Examples
Example execution: `node -r ts-node/register src/buildAssets.ts` generates: build/icon.icns, build/icon.ico, build/icons/{16,32,48,64,128,256,512}x{size}.png, src/public/images/tray/darwin/{defaultTemplate,defaultTemplate@2x,notificationTemplate,notificationTemplate@2x}.png, src/public/images/tray/win32/{default.ico,notification-{dot,1-9,plus-9}.ico}, src/public/images/tray/linux/{default,notification-{dot,1-9,plus-9}}.{png,@2x.png}
