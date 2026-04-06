---
title: Configuration
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:05:17.525Z'
updatedAt: '2026-04-04T18:05:17.525Z'
---
## Raw Concept
**Task:**
Document configuration files and options for Rocket.Chat.Electron

**Changes:**
- servers.json defines default servers
- overridden-settings.json allows settings override
- Single server mode support

**Timestamp:** 2026-04-04

## Narrative
### Structure
Configuration managed through two JSON files: servers.json for server list and overridden-settings.json for settings override. Settings can be bundled with installer or placed in user preferences folder.

### Highlights
Can create single server mode by disabling new server addition. Settings override supports 9 different configuration options including auto-update, tray icon, menu bar, and more.

### Rules
servers.json checked only if no other servers already added
override-settings.json overrides both default and user settings
Single server mode disables add new servers button and shortcuts
isTrayIconEnabled overrides isMinimizeOnCloseEnabled
