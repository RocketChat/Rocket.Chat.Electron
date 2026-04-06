---
title: Notifications System Architecture
tags: []
related: [electron_apps/rocketchat_desktop/integrations/ipc_communication_system.md, electron_apps/rocketchat_desktop/notification_system_architecture.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:22:24.917Z'
updatedAt: '2026-04-04T18:22:24.917Z'
---
## Raw Concept
**Task:**
Implement and manage Electron notifications with centralized lifecycle and state tracking

**Changes:**
- Implemented icon resolution for data URLs and HTTP URLs
- Implemented notification deduplication by tag
- Implemented state tracking for notification types and categories
- Integrated attention drawing for voice notifications

**Files:**
- src/notifications/main.ts
- src/notifications/preload.ts

**Flow:**
NOTIFICATIONS_CREATE_REQUESTED -> handleCreateEvent (deduplicate by tag) -> createNotification (attach listeners) -> dispatch NOTIFICATIONS_CREATE_RESPONDED -> [show/close/click/reply/action events] -> dispatch corresponding notification actions

**Timestamp:** 2026-04-04

## Narrative
### Structure
Notifications system in src/notifications/main.ts manages Electron Notification instances with three state maps: notifications (Map of Notification instances), notificationTypes (Map tracking voice|text), notificationCategories (Map storing DOWNLOADS|SERVER). Icon resolution handles data URLs directly and converts HTTP URLs to data URIs via invoke().

### Dependencies
Depends on Electron Notification API, Redux store for action dispatching, attentionDrawing service for voice notifications

### Highlights
Deduplication by tag prevents duplicate notifications; updates existing if tag matches. Event listeners dispatch typed actions: NOTIFICATIONS_NOTIFICATION_SHOWN, NOTIFICATIONS_NOTIFICATION_CLOSED, NOTIFICATIONS_NOTIFICATION_CLICKED, NOTIFICATIONS_NOTIFICATION_REPLIED, NOTIFICATIONS_NOTIFICATION_ACTIONED. Voice notifications trigger attentionDrawing.drawAttention().

### Rules
Rule 1: Notifications are created or updated via handleCreateEvent deduplication
Rule 2: Icon URLs are converted to data URIs for HTTP URLs
Rule 3: Voice notifications trigger attention drawing on show and stop on close
Rule 4: Notification categories are either DOWNLOADS or SERVER
