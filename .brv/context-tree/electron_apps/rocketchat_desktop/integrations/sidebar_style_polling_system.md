---
title: Sidebar Style Polling System
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:28:33.250Z'
updatedAt: '2026-04-04T18:28:33.250Z'
---
## Raw Concept
**Task:**
Implement CSS custom property polling for sidebar theme extraction from Rocket.Chat webview

**Changes:**
- Polls server CSS custom properties every 5 seconds
- Extracts sidebar background, color, and border from webapp theme
- Applies version-specific CSS classes (rcx-sidebar--main for 6.3.0+)
- Supports custom theme via setSidebarCustomTheme
- Dispatches style change events to Redux store

**Files:**
- src/servers/preload/sidebar.ts

**Flow:**
Hidden div with theme vars -> getComputedStyle() -> detect changes -> dispatch WEBVIEW_SIDEBAR_STYLE_CHANGED -> Redux store

**Timestamp:** 2026-04-04

**Patterns:**
- `var\(--sidebar-(background|item-text-color|border-color)\)` (flags: g) - CSS custom property references for sidebar theming
- `\d+` (flags: g) - Version number extraction for semantic versioning comparison

## Narrative
### Structure
The sidebar style polling system runs in the server webview preload context (src/servers/preload/sidebar.ts). It maintains a timer that polls every 5 seconds and uses a hidden DOM element to read computed CSS custom properties. Changes are tracked via comparison with previous values to avoid redundant dispatches.

### Dependencies
Requires Redux store dispatch capability (imported from ../../store). Depends on CSS custom properties being defined in the webapp theme. Version comparison needed to determine which CSS classes to apply (rcx-sidebar--main for 6.3.0+, sidebar for earlier versions).

### Highlights
Efficient change detection via computed style comparison. Supports both automatic polling and manual theme updates via setSidebarCustomTheme. Version-aware CSS class selection ensures compatibility across Rocket.Chat server versions. Custom background images can be applied via setBackground with proper URL resolution.

### Rules
Rule 1: Polling interval is fixed at 5 seconds
Rule 2: Style changes are only dispatched when values differ from previous state
Rule 3: For servers >= 6.3.0, apply rcx-sidebar--main class; otherwise use sidebar class
Rule 4: Hidden element must be appended/removed from DOM to read computed styles
Rule 5: Version comparison extracts numeric parts and compares sequentially (major, minor, patch)

### Examples
Example 1: setBackground("https://example.com/bg.jpg") creates a hidden div with backgroundImage set, polls it, and dispatches WEBVIEW_SIDEBAR_STYLE_CHANGED with extracted colors. Example 2: setSidebarCustomTheme(customCSSString) dispatches WEBVIEW_SIDEBAR_CUSTOM_THEME_CHANGED directly without polling.

## Facts
- **polling_location**: Sidebar style polling runs in server webview preload context [project]
- **polling_interval**: Polling interval is 5 seconds [project]
- **css_class_version_threshold**: For servers >= 6.3.0, applies rcx-sidebar--main CSS class [convention]
- **action_type**: Style change events are dispatched to Redux via WEBVIEW_SIDEBAR_STYLE_CHANGED action [project]

---

function versionIsGreaterOrEqualsTo(version1: string, version2: string): boolean {
  const v1 = version1.match(/\d+/g)?.map(Number) || [];
  const v2 = version2.match(/\d+/g)?.map(Number) || [];

  for (let i = 0; i < 3; i++) {
    const n1 = v1[i] || 0;
    const n2 = v2[i] || 0;
    if (n1 > n2) return true;
    if (n1 < n2) return false;
  }
  return true;
}

---

const pollSidebarStyle = (referenceElement: Element, emit: (input: Server['style']) => void): void => {
  clearTimeout(timer);
  document.body.append(referenceElement);
  const { background, color, border } = window.getComputedStyle(referenceElement);
  referenceElement.remove();

  if (prevBackground !== background || prevColor !== color || prevBorder !== border) {
    emit({ background, color, border });
    prevBackground = background;
    prevColor = color;
    prevBorder = border;
  }
  timer = setTimeout(() => pollSidebarStyle(referenceElement, emit), 5000);
};
