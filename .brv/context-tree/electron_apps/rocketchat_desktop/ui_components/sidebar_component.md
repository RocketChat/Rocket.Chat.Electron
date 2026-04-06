---
title: SideBar Component
tags: []
related: [electron_apps/rocketchat_desktop/ui_components/useservers_hook.md, electron_apps/rocketchat_desktop/ui_components/serversview_and_serverpane_components.md]
keywords: []
importance: 55
recency: 1
maturity: draft
updateCount: 1
createdAt: '2026-04-04T18:14:15.253Z'
updatedAt: '2026-04-04T18:14:35.513Z'
---
## Raw Concept
**Task:**
Document the SideBar component that renders the vertical server list in Rocket.Chat Desktop

**Changes:**
- Renders vertical server list with drag-and-drop reordering
- Supports keyboard shortcuts Cmd/Ctrl+1-9 for quick server switching
- Visibility controlled by servers.length and isSideBarEnabled state
- Dispatches Redux actions for user interactions

**Files:**
- src/ui/components/SideBar/index.tsx
- src/ui/components/SideBar/ServerButton.tsx

**Flow:**
Component renders -> useServers fetches data -> useSorting handles drag-and-drop -> useKeyboardShortcuts enables shortcuts -> ServerButton renders each server -> dispatch Redux actions on user interaction

**Timestamp:** 2026-04-04

## Narrative
### Structure
The SideBar component is located in src/ui/components/SideBar/index.tsx and serves as the main vertical navigation for server selection. It uses three custom hooks: useServers for data, useSorting for drag-and-drop functionality, and useKeyboardShortcuts for keyboard navigation. The component renders a ButtonGroup containing ServerButton components for each server, plus an add server button and a settings menu.

### Dependencies
Depends on @rocket.chat/fuselage UI library, react-redux for state management, react-i18next for translations, and custom hooks (useServers, useSorting, useKeyboardShortcuts). Requires Redux store with isSideBarEnabled, isAddNewServersEnabled, and isTransparentWindowEnabled selectors.

### Highlights
Key features: (1) Drag-and-drop server reordering with draggedServerUrl state tracking, (2) Keyboard shortcuts for Cmd+1-9 (or Ctrl+1-9 on non-Darwin) to switch servers, (3) Server badges showing unread message counts, (4) Platform-specific styling (transparent background on macOS when enabled), (5) Context menu via ServerInfoDropdown, (6) Conditional rendering based on server count and sidebar enabled state

### Rules
Rule 1: Component is hidden when servers.length === 0 or isSideBarEnabled is false
Rule 2: Keyboard shortcuts are numbered 1-9, with order based on sorted server position
Rule 3: Server title displays as "Rocket.Chat - {url}" for non-open.rocket.chat instances
Rule 4: Sidebar background is undefined on Darwin with transparent window, otherwise "tint"
Rule 5: Each server button receives favicon, version, and supported versions information
Rule 6: Settings menu actions are dispatched as Redux actions (SIDE_BAR_DOWNLOADS_BUTTON_CLICKED, SIDE_BAR_SETTINGS_BUTTON_CLICKED)

### Examples
Example server button props: url, title, shortcutNumber, isSelected, favicon, hasUnreadMessages, userLoggedIn, mentionCount, isDragged, version, isSupportedVersion, supportedVersionsSource, supportedVersionsFetchState, supportedVersions, exchangeUrl, isShortcutVisible. Example Redux actions dispatched: SIDE_BAR_ADD_NEW_SERVER_CLICKED, SIDE_BAR_DOWNLOADS_BUTTON_CLICKED, SIDE_BAR_SETTINGS_BUTTON_CLICKED
