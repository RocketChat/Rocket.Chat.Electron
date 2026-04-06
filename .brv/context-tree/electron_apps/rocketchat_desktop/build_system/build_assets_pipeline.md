---
title: Build Assets Pipeline
tags: []
related: [electron_apps/rocketchat_desktop/build_system/build_and_bundling.md]
keywords: []
importance: 55
recency: 1
maturity: draft
updateCount: 1
createdAt: '2026-04-04T18:27:20.213Z'
updatedAt: '2026-04-04T18:47:33.712Z'
---
## Raw Concept
**Task:**
Build assets generation pipeline for Rocket.Chat Electron app - converts SVG icons to platform-specific formats (PNG, ICO, ICNS)

**Changes:**
- SVG-based icon system using React components
- Puppeteer-based rendering for precise size conversion
- Multi-resolution support for all platforms
- Automated tray icon badge generation

**Files:**
- src/buildAssets.ts
- src/public/images/

**Flow:**
React SVG components -> renderToStaticMarkup -> puppeteer screenshot -> Jimp/icns-convert/ico-convert -> platform-specific format files

**Timestamp:** 2026-04-04

## Narrative
### Structure
The build assets pipeline is implemented in src/buildAssets.ts and orchestrates icon generation across three categories: (1) Application icons for macOS (.icns), Windows (.ico), and Linux (PNG set), (2) System tray icons with platform-specific formats and badge support, (3) Installer UI assets (DMG background for macOS, NSIS sidebar for Windows). React components define the visual design, Puppeteer renders them to PNG at multiple resolutions, then format-specific converters create the final assets.

### Dependencies
Requires: puppeteer (headless browser rendering), @fiahfy/icns-convert (macOS icon format), @fiahfy/ico-convert (Windows icon format), Jimp (image manipulation), rimraf (directory cleanup). React and react-dom/server for SVG component rendering.

### Highlights
Fully automated icon generation from single React components. Supports all platform requirements: macOS Retina displays (@2x variants), Windows multi-resolution ICO format (16-256px), Linux standard icon sizes (16-512px). Tray icons include notification badges with values 1-10 and dot indicator. Installer assets include DMG background (600x422px with 2x variant) and NSIS sidebar (164x314px as BMP).

### Rules
Rule 1: convertSvgToPng renders SVG at specified sizes using puppeteer with headless mode and --use-gl=desktop flag
Rule 2: All tray icons regenerated fresh via rimraf before creation to prevent stale assets
Rule 3: Badge values for tray icons: dot (•), numbers 1-9, and 10+ shown as "plus-9"
Rule 4: macOS app icon sizes: 1024, 512, 256, 128, 64, 48, 32, 16px
Rule 5: Windows app icon sizes: 16, 24, 32, 48, 64, 128, 256px (multi-res ICO)
Rule 6: Linux app icon sizes: 16, 32, 48, 64, 128, 256, 512px (individual PNG files)
Rule 7: macOS tray icon sizes: 24px (1x) and 48px (2x) with defaultTemplate and notificationTemplate variants
Rule 8: Windows tray icon sizes: 16, 24, 32, 48, 64, 128, 256px (multi-res ICO with badge variants)
Rule 9: Linux tray icon sizes: 64px (1x) and 128px (2x) with badge variants
Rule 10: NSIS sidebar converted to BMP format using Jimp

### Examples
Example macOS tray icons: src/public/images/tray/darwin/defaultTemplate.png (24px), defaultTemplate@2x.png (48px), notificationTemplate.png (24px), notificationTemplate@2x.png (48px). Example Windows tray: src/public/images/tray/win32/default.ico (multi-res), notification-1.ico through notification-10.ico, notification-dot.ico, notification-plus-9.ico. Example Linux tray: src/public/images/tray/linux/default.png (64px), default@2x.png (128px), notification-{1-10}.png, notification-dot.png, notification-plus-9.png with @2x variants.
