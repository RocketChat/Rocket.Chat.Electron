---
children_hash: ff9a310d434d0abe25d0f63fa43ead476a6478be913f79189e453d8c43a1efb1
compression_ratio: 0.22156196943972836
condensation_order: 0
covers: [asset_generation_pipeline.md, build_and_bundling.md, build_assets_pipeline.md, image_assets_organization.md, svg_to_format_conversion_process.md]
covers_token_total: 3534
summary_level: d0
token_count: 783
type: summary
---
# Build System Overview

The Rocket.Chat Electron build system comprises two interconnected pipelines: **Rollup-based source bundling** and **asset generation from React SVG components**.

## Core Build Pipeline

**Rollup bundling** (see `build_and_bundling.md`) processes three entry points—`main.ts` (main process), `rootWindow.ts` (renderer), `preload.ts` (IPC bridge)—into executable output in the `app/` folder. The `electron-builder` tool then packages this for target platforms (Windows/macOS/Linux) into distribution files in `dist/`. Only modules listed in `dependencies` (not `devDependencies`) are included in the distributable.

## Asset Generation Pipeline

**SVG-to-platform-format conversion** (see `build_assets_pipeline.md`, `asset_generation_pipeline.md`, `svg_to_format_conversion_process.md`) automates icon and installer asset generation:

1. **React SVG Components** define visual design (app icons, tray icons, DMG backgrounds, NSIS sidebars)
2. **Puppeteer Rendering** converts components to PNG at multiple resolutions using `convertSvgToPng()` with GPU acceleration (`--use-gl=desktop`)
3. **Format Conversion** applies platform-specific libraries:
   - macOS: `@fiahfy/icns-convert` → `.icns` files
   - Windows: `@fiahfy/ico-convert` → multi-resolution `.ico` files
   - Linux: Jimp → individual `.png` files
   - Installers: Jimp → BMP (NSIS sidebar)

The pipeline is orchestrated by `src/buildAssets.ts` (standalone script, not part of Rollup bundle).

## Asset Organization

Generated assets are stored in `src/public/images/` (see `image_assets_organization.md`):

- **tray/** — Platform-specific system tray icons with notification badge variants (1-10, dot, plus-9)
  - `darwin/` — macOS: 24px and 48px (@2x) with `defaultTemplate` and `notificationTemplate` variants
  - `win32/` — Windows: 16-256px multi-resolution ICO format
  - `linux/` — Linux: 64px and 128px (@2x) PNG files
- **touch-bar/** — macOS Touch Bar formatting buttons (bold, italic, strike, inline_code, multi_line)
- **Root level** — `icon.ico` (Windows app icon), `file-icon.svg` (download display)

## Platform-Specific Icon Specifications

| Platform | App Icon Sizes | Tray Icon Sizes | Format | Retina Support |
|----------|---|---|---|---|
| macOS | 1024, 512, 256, 128, 64, 48, 32, 16px | 24px (1x), 48px (2x) | ICNS | @2x variants |
| Windows | 16, 24, 32, 48, 64, 128, 256px | 16-256px multi-res | ICO | Multi-resolution ICO |
| Linux | 16, 32, 48, 64, 128, 256, 512px | 64px (1x), 128px (2x) | PNG | @2x variants |

Installer assets: DMG background (600×422px with 1200×844px @2x), NSIS sidebar (164×314px as BMP).

## Key Architectural Decisions

- **Puppeteer-based rendering** ensures pixel-perfect icon generation from React components
- **Fresh asset regeneration** via `rimraf` prevents stale files
- **Flexible sizing** supports both square (single number) and rectangular ([width, height]) assets
- **macOS Template naming** (`defaultTemplate`, `notificationTemplate`) enables proper system appearance integration
- **Notification badges** generated for all platforms with consistent naming (1-9, dot, plus-9)