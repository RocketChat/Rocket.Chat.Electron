---
title: Build Pipeline
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T18:05:17.524Z'
updatedAt: '2026-04-04T18:05:17.524Z'
---
## Raw Concept
**Task:**
Document build process and entry points for Rocket.Chat.Electron

**Files:**
- src/main.ts
- src/rootWindow.ts
- src/preload.ts

**Flow:**
src folder -> Rollup bundler -> app folder (runnable application)

**Timestamp:** 2026-04-04

## Narrative
### Structure
Three entry files orchestrate the build: src/main.ts runs in main Electron process, src/rootWindow.ts renders UI, src/preload.ts runs in privileged mode. Rollup bundler compiles src/ to app/ folder.

### Highlights
Source code in src/ is automatically built when running yarn start. Output goes to app/ folder. Test files match glob pattern *.(spec|test).{js,ts,tsx}.

### Rules
Only dependencies (not devDependencies) are included in distributable app
Test files must match pattern: *.(spec|test).{js,ts,tsx}
src/main.ts orchestrates whole application
src/rootWindow.ts renders root window UI
src/preload.ts connects app and webviews
