---
title: Development Setup
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
Document development prerequisites and quick start

**Changes:**
- Node.js >= 24.11.1 required
- Yarn >= 4.0.2 required
- Git required

**Flow:**
Clone repo -> Install dependencies (yarn) -> Start dev server (yarn start)

**Timestamp:** 2026-04-04

## Narrative
### Structure
Development requires Git, Node.js 24.11.1+, and Yarn 4.0.2+. Quick start involves cloning the repository and running yarn to install dependencies, then yarn start to launch the app.

### Highlights
TypeScript 5 rewrite improves maintainability. Source code automatically rebuilt on changes during development.

### Rules
Node.js minimum version: 24.11.1
Yarn minimum version: 4.0.2
Git is required for cloning repository

### Examples
Quick start commands:
git clone https://github.com/RocketChat/Rocket.Chat.Electron.git
cd Rocket.Chat.Electron
yarn
yarn start
