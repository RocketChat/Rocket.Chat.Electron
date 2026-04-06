---
title: User Presence System
tags: []
related: [electron_apps/rocketchat_desktop/integrations/ipc_communication_system.md, structure/redux_store/redux_store_architecture.md]
keywords: []
importance: 55
recency: 1
maturity: draft
updateCount: 1
createdAt: '2026-04-04T18:20:49.641Z'
updatedAt: '2026-04-04T18:24:07.758Z'
---
## Raw Concept
**Task:**
Implement Electron-based user presence detection system that bridges system power events to Rocket.Chat server presence API

**Changes:**
- Lightweight 4-file architecture in src/userPresence/
- Power monitor listeners for suspend and lock-screen events
- IPC channel for system idle state polling
- Redux-based event dispatch and action handling
- Auto-away feature with configurable idle threshold

**Files:**
- src/userPresence/main.ts
- src/userPresence/preload.ts
- src/userPresence/common.ts
- src/userPresence/actions.ts

**Flow:**
System power event (suspend/lock-screen) → dispatch Redux action → preload listener → call setUserOnline(false) callback to Rocket.Chat server

**Timestamp:** 2026-04-04

**Patterns:**
- `power-monitor/get-system-idle-state` - IPC channel for querying system idle state
- `SYSTEM_SUSPENDING|SYSTEM_LOCKING_SCREEN` - Redux action types for power events
- `active|idle|locked|unknown` - Possible SystemIdleState values

## Narrative
### Structure
Four-module system: main.ts sets up powerMonitor listeners and IPC handler; preload.ts exposes setUserPresenceDetection API with callback attachment/detachment; common.ts defines SystemIdleState type; actions.ts defines Redux action types.

### Dependencies
Requires: Electron powerMonitor API, Redux store with listen() function, IPC communication system (handle/invoke), Rocket.Chat server presence API (Meteor.call UserPresence:away/online)

### Highlights
Detects system suspension and lock-screen events, polls idle state every 2 seconds when auto-away enabled, supports configurable idle threshold, provides clean callback attachment/detachment lifecycle

### Rules
Rule 1: Power monitor listeners must dispatch SYSTEM_SUSPENDING on suspend event
Rule 2: Power monitor listeners must dispatch SYSTEM_LOCKING_SCREEN on lock-screen event
Rule 3: setUserPresenceDetection must detach previous callbacks before attaching new ones
Rule 4: Polling only occurs if isAutoAwayEnabled AND idleThreshold are both set
Rule 5: User is marked online when system state is active or unknown
Rule 6: IPC handler must accept idleThreshold parameter and return system idle state

### Examples
Example: setUserPresenceDetection({ isAutoAwayEnabled: true, idleThreshold: 300, setUserOnline: (online) => Meteor.call(online ? "UserPresence:online" : "UserPresence:away") })
Example system state values: "active" (user is using system), "idle" (no user input), "locked" (screen locked), "unknown" (cannot determine)
