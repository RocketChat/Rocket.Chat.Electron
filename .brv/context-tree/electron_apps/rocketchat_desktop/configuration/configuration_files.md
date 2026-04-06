---
title: Configuration Files
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:06:23.175Z'
updatedAt: '2026-04-04T18:06:23.175Z'
---
## Raw Concept
**Task:**
Document servers.json and overridden-settings.json configuration system

**Changes:**
- servers.json defines default servers on first app launch
- overridden-settings.json allows admin configuration overrides
- Post-install configuration via user preferences folder

**Flow:**
App startup -> Check for servers.json -> Load default servers -> Check overridden-settings.json -> Apply overrides

**Timestamp:** 2026-04-04

## Narrative
### Structure
Two JSON configuration files: servers.json (server list) and overridden-settings.json (settings overrides). Both can be bundled with the app or placed in user preferences folder. User preferences folder location varies by platform.

### Dependencies
Platform-specific paths: Windows (%APPDATA%/Rocket.Chat/ or Program Files/Rocket.Chat/Resources/), macOS (~/Library/Application Support/Rocket.Chat/ or /Library/Preferences/Rocket.Chat/), Linux (~/.config/Rocket.Chat/ or /opt/Rocket.Chat/resources/)

### Highlights
servers.json format: JSON object with server name keys and URL values. overridden-settings.json allows disabling features like auto-update, enabling single server mode, and customizing tray behavior. Settings override both default and user settings.

### Rules
Rule 1: servers.json only checked on first app launch or when all servers removed
Rule 2: Post-install servers.json overwrites bundled version
Rule 3: overridden-settings.json settings take precedence over all other settings
Rule 4: Single server mode enabled by setting isAddNewServersEnabled: false
