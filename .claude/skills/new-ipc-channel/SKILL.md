---
name: new-ipc-channel
description: Scaffold a new IPC channel with proper TypeScript types
---

# New IPC Channel

Add a new type-safe IPC channel to the Rocket.Chat Electron app. This scaffolds the channel definition, main process handler, and renderer invoke call.

## Arguments (required)

- `name`: Channel name using domain/action format (e.g., `downloads/clear-all`, `notifications/dismiss`)
- `args`: TypeScript argument types (e.g., `(itemId: string)` or `()` for no args)
- `return`: TypeScript return type (e.g., `void`, `boolean`, `{ success: boolean }`)

## Steps

### 1. Add Channel Type Definition

Edit `src/ipc/channels.ts` and add the new channel to the `ChannelToArgsMap` type:

```typescript
type ChannelToArgsMap = {
  // ... existing channels ...
  '<name>': (<args>) => <return>;
};
```

Add any needed imports at the top of the file if the types reference domain-specific types.

### 2. Add Main Process Handler

Identify the correct main process file based on the channel domain:
- `downloads/*` → `src/downloads/main.ts`
- `notifications/*` → `src/notifications/main.ts`
- `servers/*` → `src/servers/main.ts`
- `video-call-window/*` → `src/videoCallWindow/main.ts`
- `outlook-calendar/*` → `src/outlookCalendar/main.ts`
- `document-viewer/*` → `src/documentViewer/main.ts`

Add the handler using the existing pattern in that file. Look at sibling handlers for the correct pattern - they use `ipcMain.handle` or the project's `handle` wrapper from `src/ipc/main.ts`.

### 3. Add Renderer Invoke (if needed)

If this channel is called from the renderer process, add the invoke call in the appropriate renderer file or in `src/ipc/renderer.ts` following the existing pattern.

### 4. Verify

Run type checking to ensure the new channel compiles:
```bash
npx tsc --noEmit
```

## Pattern Reference

The IPC system uses a centralized type map (`ChannelToArgsMap`) that enforces type safety between main and renderer processes. The `Channel` and `Handler` types are derived from this map:

```typescript
export type Channel = keyof ChannelToArgsMap;
export type Handler<N extends Channel> = ChannelToArgsMap[N];
```

All 71+ existing channels follow the `'domain/action'` naming convention.
