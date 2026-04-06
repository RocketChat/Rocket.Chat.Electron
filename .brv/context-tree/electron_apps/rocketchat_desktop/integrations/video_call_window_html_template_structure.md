---
title: Video Call Window HTML Template Structure
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:45:28.668Z'
updatedAt: '2026-04-04T18:45:28.668Z'
---
## Raw Concept
**Task:**
Document HTML template structure and DOM elements for video call window

**Changes:**
- HTML5 template with CSP script-src self
- Webview container for video call rendering
- Loading and error overlays
- Screen picker UI root

**Files:**
- src/public/video-call-window.html

**Timestamp:** 2026-04-04

## Narrative
### Structure
HTML5 document with UTF-8 charset, CSP policy (script-src self), stylesheets (main.css, loading.css, error.css, icons/rocketchat.css), dark background (#2f343d). DOM structure: webview-container (absolute fill), loading-overlay-root (three-dot bounce animation), error-overlay-root (error display with reload button), screen-picker-root (screen picker UI).

### Highlights
Webview container styled with absolute positioning, inset: 0, width/height 100%, display: inline-flex. Loading overlay uses three divs with loading__animation__bounce--medium class. Error overlay includes error-background, error-title (h1), error-announcement (h3), error-message, and error-reload-button. CSP restricts scripts to self only.

### Rules
Rule 1: CSP policy: script-src self
Rule 2: Background color: #2f343d
Rule 3: Webview container: position absolute, inset 0, width/height 100%, display inline-flex
