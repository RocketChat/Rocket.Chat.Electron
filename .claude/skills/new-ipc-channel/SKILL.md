---
name: new-ipc-channel
description: Scaffold a new IPC channel with proper TypeScript types
---

# New IPC Channel

Add a new type-safe IPC channel to the Rocket.Chat Electron app. This skill
creates the channel definition, the handler, and the invoke call.

## Arguments (required)

- `name`: Channel name in domain/action format (e.g., `downloads/clear-all`, `notifications/dismiss`)
- `args`: TypeScript argument types (e.g., `(itemId: string)` or `()` for no args)
- `return`: TypeScript return type (e.g., `void`, `boolean`, `{ success: boolean }`)

## Steps

### 1. Add Channel Type Definition

Edit `src/ipc/channels.ts`. Add the new channel to the `ChannelToArgsMap` type:

```typescript
type ChannelToArgsMap = {
  // ... existing channels ...
  '<name>': (<args>) => <return>;
};
```

If the types reference domain-specific types, add the imports at the top of the file.

### 2. Pick the Direction

A channel can go either way. `src/ipc/main.ts` and `src/ipc/renderer.ts` each export a `handle` and an `invoke`:

- **The renderer calls the main process.** Register the handler with `handle` from `src/ipc/main.ts`. Its handler gets the caller's `webContents` as the first argument. Call the channel with `invoke` from `src/ipc/renderer.ts`.
- **The main process calls the renderer.** Register the handler with `handle` from `src/ipc/renderer.ts`. Call the channel with `invoke` from `src/ipc/main.ts`, which takes the target `webContents` as the first argument. Examples: `notifications/fetch-icon` and `servers/fetch-info`.

### 3. Add the Handler

Put the handler next to the existing handlers of its domain:

- `downloads/*` → `src/downloads/main.ts`
- `notifications/*` → `src/notifications/renderer.ts` (the main process calls the renderer)
- `servers/*` → `src/servers/renderer.ts` (the main process calls the renderer)
- `video-call-window/*` → `src/videoCallWindow/ipc.ts`
- `outlook-calendar/*` → `src/outlookCalendar/ipc.ts`
- `document-viewer/*` → `src/documentViewer/ipc.ts`

Use the project's `handle` wrapper, like the existing handlers. Call `ipcMain.handle` directly only when the file already does.

### 4. Add the Invoke Call

Add the `invoke` call on the calling side, next to the code that needs the result. Follow the existing pattern.

### 5. Check

Run the type check to make sure the new channel compiles:

```bash
npx tsc --noEmit
```

## Pattern Reference

The IPC system uses one central type map (`ChannelToArgsMap`). The map enforces type safety between the main and renderer processes. The `Channel` and `Handler` types come from this map:

```typescript
export type Channel = keyof ChannelToArgsMap;
export type Handler<N extends Channel> = ChannelToArgsMap[N];
```

Name each channel `'domain/action'`, like the existing channels.
