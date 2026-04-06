---
title: Video Call Window Overlay Stylesheets
tags: []
keywords: []
importance: 55
recency: 1
maturity: draft
updateCount: 1
createdAt: '2026-04-04T18:45:19.082Z'
updatedAt: '2026-04-04T18:45:45.386Z'
---
## Raw Concept
**Task:**
Document the loading and error overlay stylesheets for video call window

**Changes:**
- Loading overlay implements three-dot bounce animation
- Error overlay includes background pattern and reload button
- Both overlays use fixed positioning and flexbox layout

**Files:**
- src/public/loading.css
- src/public/error.css

**Flow:**
Video call window initializes -> shows loading overlay -> on error shows error overlay with reload button

**Timestamp:** 2026-04-04

## Narrative
### Structure
Two CSS files handle overlays for video-call-window.html: loading.css provides initialization feedback, error.css provides error recovery UI. Both use fixed positioning, dark #2f343d background, and flexbox centering.

### Highlights
Loading animation uses CSS keyframes with staggered delays for three-dot bounce effect. Error overlay includes decorative SVG background pattern and Rocket.Chat branded blue (#1d74f5) reload button with hover/active/focus states.

### Rules
Rule 1: Overlays are hidden by default (display:none) and shown by adding class "show"
Rule 2: Loading overlay z-index is 999, error overlay z-index is 1000
Rule 3: Loading animation duration is 1.4 seconds with infinite loop
Rule 4: Both overlays use system-ui font family
Rule 5: Error button has transition effect on background-color (0.2s)

## Facts
- **loading_overlay_z_index**: Loading overlay z-index is 999 [project]
- **error_overlay_z_index**: Error overlay z-index is 1000 [project]
- **animation_duration**: Loading animation duration is 1.4 seconds [project]
- **loading_bg_color**: Loading overlay background color is #2f343d (dark gray) [project]
- **error_bg_color**: Error overlay background color is #2f343d (dark gray) [project]
- **button_color**: Error reload button color is #1d74f5 (Rocket.Chat blue) [project]
- **overlay_visibility**: Both overlays are hidden by default with display:none and shown with class 'show' [convention]
- **usage_context**: Overlays are used exclusively by video-call-window.html [project]
