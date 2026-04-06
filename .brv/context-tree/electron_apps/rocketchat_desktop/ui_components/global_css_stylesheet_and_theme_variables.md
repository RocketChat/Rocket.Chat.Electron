---
title: Global CSS Stylesheet and Theme Variables
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:44:35.111Z'
updatedAt: '2026-04-04T18:44:35.111Z'
---
## Raw Concept
**Task:**
Document the global CSS stylesheet (main.css) that provides shared CSS custom properties and theme tokens across all Rocket.Chat Desktop application windows

**Changes:**
- Defines CSS custom properties (variables) for theme colors compatible with Fuselage design system
- Imported by all three HTML templates (index.html, log-viewer-window.html, video-call-window.html)
- Very small file (199 bytes)

**Files:**
- src/public/main.css

**Flow:**
main.css imports Fuselage CSS and GitHub Markdown CSS -> defines :root CSS variables -> loaded by all window templates

**Timestamp:** 2026-03-27

**Patterns:**
- `--rcx-color-.*` - CSS custom property naming convention for Rocket.Chat/Fuselage color tokens (prefix: --rcx-color-)
- `rgba\(\d+,\s*\d+,\s*\d+,\s*[0-9.]+\)` - RGBA color format for semi-transparent overlay colors

## Narrative
### Structure
Universal base stylesheet located at src/public/main.css. Imports two external stylesheets (Fuselage CSS and GitHub Markdown CSS) and defines CSS custom properties in the :root selector for global theme variables. Loaded by all three HTML templates: index.html (main renderer), log-viewer-window.html (log viewer window), and video-call-window.html (video call window).

### Dependencies
Depends on @rocket.chat/fuselage CSS library (imported from node_modules/@rocket.chat/fuselage/dist/fuselage.css) and github-markdown-css library (imported from node_modules/github-markdown-css/github-markdown.css). All windows must have this stylesheet loaded for consistent theming.

### Highlights
Provides Fuselage design system theme tokens across all windows. Defines surface overlay color (--rcx-color-surface-overlay: rgba(47, 52, 61, 0.5)) for consistent semi-transparent overlays. Centralizes theme management in a single 199-byte file.

### Examples
CSS custom property usage: --rcx-color-surface-overlay can be used in any window via var(--rcx-color-surface-overlay) for consistent overlay styling across the application.

## Facts
- **stylesheet_location**: src/public/main.css is the universal base stylesheet for all windows [project]
- **stylesheet_usage**: main.css is loaded by three HTML templates: index.html, log-viewer-window.html, video-call-window.html [project]
- **file_size**: The stylesheet file is 199 bytes in size [project]
- **overlay_color**: CSS custom property --rcx-color-surface-overlay is defined as rgba(47, 52, 61, 0.5) [project]
- **fuselage_import**: The stylesheet imports Fuselage CSS from @rocket.chat/fuselage/dist/fuselage.css [project]
- **markdown_css_import**: The stylesheet imports GitHub Markdown CSS from github-markdown-css/github-markdown.css [project]
