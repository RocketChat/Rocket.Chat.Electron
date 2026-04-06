---
children_hash: 4dbeabeeb51388cf94fd92e1a21d2edc9cc478ee9c19ce9b665c786501630f15
compression_ratio: 0.8472622478386167
condensation_order: 0
covers: [three_layer_architecture_overview.md]
covers_token_total: 347
summary_level: d0
token_count: 294
type: summary
---
# Rocket.Chat Electron Architecture

## Three-Layer Design

Rocket.Chat Electron implements a three-layer architecture separating concerns across the application:

**Layer 1: Main Process** — Handles server resolution, certificate trust validation, and deep link parsing via `src/servers/main.ts`, `src/navigation/main.ts`, and `src/deepLinks/main.ts`.

**Layer 2: Redux Store** — Provides single source of truth using FSA (Flux Standard Action) actions and memoized reselect selectors. Store is shared between main and renderer processes via IPC middleware (`src/store/`).

**Layer 3: Renderer/React** — Renders UI through Shell root component with SideBar and ServersView layout. Each server runs in a persistent webview managed by ReparentingContainer (`src/ui/components/Shell/index.tsx`).

## Data Flow

Main Process (servers, navigation, deepLinks) → Redux Store (FSA actions, reselect selectors) → Renderer/React (Shell, SideBar, ServersView, webviews)

IPC synchronization between layers enables reactive updates across the application while maintaining clear separation of concerns.

**For detailed implementation patterns, see:** three_layer_architecture_overview.md