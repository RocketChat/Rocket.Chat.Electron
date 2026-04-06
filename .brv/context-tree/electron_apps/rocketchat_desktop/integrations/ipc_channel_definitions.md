---
title: IPC Channel Definitions
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:18:06.062Z'
updatedAt: '2026-04-04T18:18:06.062Z'
---
## Raw Concept
**Task:**
Define and document all IPC channels available for inter-process communication

**Changes:**
- Redux channels: redux/get-initial-state, redux/action-dispatched
- Server channels: servers/fetch-info with version response
- Notification channels: notifications/fetch-icon
- Power monitoring: power-monitor/get-system-idle-state
- Download management: 7 channels (show-in-folder, copy-link, pause, resume, cancel, retry, remove)
- Certificate management: certificatesManager/remove
- Server view: 3 channels (get-url, ready, open-url-on-browser)
- Video call window: 17 channels for window management, screen sharing, credentials, language, and caching
- Screen capture: 2 channels (jitsi-desktop-capturer-get-sources, desktop-capturer-get-sources)
- Outlook calendar: 5 channels for events, credentials, and tokens
- Document viewer: 2 channels (open-window, fetch-content)
- Log viewer: 8 channels for file operations, log reading, and clearing
- Screen picker: 4 channels (open, source-responded, permission check, open-url)

## Narrative
### Structure
ChannelToArgsMap is a TypeScript type union mapping channel names (strings) to handler function signatures. Each entry defines the exact parameters and return type for that channel.

### Highlights
60+ distinct channels covering: state management, server operations, downloads, notifications, video conferencing, screen sharing, calendar integration, document viewing, logging, and screen picking. Type-safe with Handler<N> mapped type ensuring compile-time correctness.
