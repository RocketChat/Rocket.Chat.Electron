---
title: SVG to Format Conversion Process
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:47:33.714Z'
updatedAt: '2026-04-04T18:47:33.714Z'
---
## Raw Concept
**Task:**
SVG to platform-specific format conversion process - rendering React SVG components via Puppeteer and converting to PNG/ICO/ICNS/BMP

**Files:**
- src/buildAssets.ts

**Flow:**
React.createElement(SvgComponent) -> renderToStaticMarkup -> base64 data URL -> puppeteer page.goto -> page.setViewport -> page.screenshot(PNG) -> format conversion library -> final asset file

**Timestamp:** 2026-04-04

**Patterns:**
- `convertSvgToPng\(svg: string, ...sizes: \(number \| \[number, number\]\)\[\]\): Promise<Buffer\[\]>` - Async function that converts SVG string to PNG buffers at specified sizes. Sizes can be single number (square) or [width, height] tuple.

## Narrative
### Structure
The conversion process has three main steps: (1) React SVG component rendering using renderToStaticMarkup to create SVG markup string, (2) Puppeteer-based screenshot rendering converting SVG to PNG at specified resolutions, (3) Format-specific conversion using platform libraries (icns-convert for macOS, ico-convert for Windows, Jimp for image manipulation). Each step is wrapped in async functions following the pattern: createMacOS{Asset}, createWindows{Asset}, createLinux{Asset}.

### Dependencies
Puppeteer: headless=true, args=[--use-gl=desktop] for GPU acceleration. Format converters: @fiahfy/icns-convert for ICNS format, @fiahfy/ico-convert for ICO format. Jimp for BMP conversion. React/react-dom/server for component rendering.

### Highlights
Puppeteer launches with GPU acceleration (--use-gl=desktop flag) for faster rendering. Each size is rendered separately with page.setViewport and page.screenshot with omitBackground=true for transparency. Supports flexible sizing: single number for square icons or [width, height] tuple for non-square assets like DMG backgrounds and NSIS sidebars. Buffers are collected and passed to format-specific converters which handle multi-resolution ICO/ICNS generation.

### Rules
Rule 1: convertSvgToPng accepts variable number of size arguments as spread operator
Rule 2: Size can be number (creates square NxN) or [width, height] tuple for rectangular assets
Rule 3: Puppeteer launches with headless: true and --use-gl=desktop args
Rule 4: page.setViewport sets deviceScaleFactor: 1 for 1:1 pixel rendering
Rule 5: page.screenshot uses type: "png" and omitBackground: true for transparent background
Rule 6: Browser and page are properly closed after rendering (page.close, browser.close)
Rule 7: All buffers are collected in array before passing to format converters
Rule 8: Format converters (icnsConvert.convert, icoConvert.convert) consume entire buffer array and return single output buffer

### Examples
Example: convertSvgToPng(macOSAppIconSvg, 1024, 512, 256, 128, 64, 48, 32, 16) creates PNG buffers for 8 sizes. Example: convertSvgToPng(dmgBackgroundSvg, [600, 422], [1200, 844]) creates 2 PNG buffers for 1x and 2x resolution.
