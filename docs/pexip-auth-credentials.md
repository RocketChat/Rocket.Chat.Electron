# Pexip Video Call — Auth Credentials for Embedded Rocket.Chat Iframe

## Overview

When a Pexip video call is opened in the Electron app, Pexip may embed a Rocket.Chat iframe inside its interface (e.g., for in-call chat). This iframe needs the user's authentication credentials (`userId` and `authToken`) to authenticate against the Rocket.Chat server. The Electron app automatically captures these credentials from the originating server webview and makes them available to the Pexip page via a secure API.

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  RC Server Webview (origin: https://chat.example.com)            │
│  ├── Meteor.loginToken → localStorage['Meteor.loginToken']       │
│  ├── Meteor.userId     → localStorage['Meteor.userId']           │
│  └── openInternalVideoChatWindow(url, {providerName: 'pexip'})   │
│       └── auto-grabs credentials from localStorage               │
│       └── sends IPC: 'video-call-window/open-window'             │
│            with { providerName, credentials: {userId, authToken} }│
├──────────────────────────────────────────────────────────────────┤
│  Main Process (src/videoCallWindow/ipc.ts)                       │
│  ├── Stores credentials + serverUrl in memory                    │
│  ├── Stores providerName (used by JitsiBridge guard)             │
│  ├── Handles 'video-call-window/get-credentials' → returns creds │
│  ├── Handles 'video-call-window/get-provider-sync' → sync IPC    │
│  └── Clears credentials when video call window closes            │
├──────────────────────────────────────────────────────────────────┤
│  Video Call BrowserWindow                                        │
│  └── <webview> loads Pexip URL                                   │
│       └── Preload: src/videoCallWindow/preload/index.ts          │
│            └── contextBridge exposes:                             │
│                 window.videoCallWindow.getAuthCredentials()       │
│                 → returns { userId, authToken, serverUrl } | null│
├──────────────────────────────────────────────────────────────────┤
│  Pexip Page (inside webview)                                     │
│  └── Calls window.videoCallWindow.getAuthCredentials()           │
│  └── Uses credentials to authenticate embedded RC iframe         │
└──────────────────────────────────────────────────────────────────┘
```

## Credential Flow — Step by Step

### 1. Credential Capture (Server Preload)

**File:** `src/servers/preload/internalVideoChatWindow.ts`

When `openInternalVideoChatWindow()` is called with `providerName: 'pexip'`, the function `getCredentialsForPexip()` reads the Meteor auth data directly from the server webview's `localStorage`:

```typescript
const authToken = localStorage.getItem('Meteor.loginToken');
const userId = localStorage.getItem('Meteor.userId');
```

These are standard Meteor keys set automatically when a user logs in. Each server webview has isolated localStorage (separate webContents, separate origin), so in a multi-workspace setup, the credentials always belong to the workspace that initiated the call.

The credentials are attached to the options object and sent via IPC:

```typescript
ipcRenderer.invoke('video-call-window/open-window', url, {
  providerName: 'pexip',
  credentials: { userId, authToken },
});
```

### 2. Main Process Storage

**File:** `src/videoCallWindow/ipc.ts`

The `open-window` handler receives the options, extracts the server origin from the calling webContents URL, and stores everything in module-level variables:

```typescript
videoCallProviderName = options?.providerName ?? null;
videoCallCredentials = {
  userId: options.credentials.userId,
  authToken: options.credentials.authToken,
  serverUrl: serverOrigin,  // derived from _wc.getURL()
};
```

A typed IPC handler serves the credentials:

```typescript
handle('video-call-window/get-credentials', async () => {
  return videoCallCredentials;
});
```

Both `videoCallCredentials` and `videoCallProviderName` are cleared to `null` when the video call window closes.

### 3. Webview Preload API

**File:** `src/videoCallWindow/preload/index.ts`

The preload script exposes the credentials via `contextBridge`:

```typescript
contextBridge.exposeInMainWorld('videoCallWindow', {
  getAuthCredentials: async () => {
    return ipcRenderer.invoke('video-call-window/get-credentials');
  },
  // ... other methods
});
```

### 4. Pexip Consumption

The Pexip page running inside the webview calls:

```javascript
const credentials = await window.videoCallWindow.getAuthCredentials();
if (credentials) {
  const { userId, authToken, serverUrl } = credentials;
  // Use these to authenticate the embedded Rocket.Chat iframe
  // e.g., append ?resumeToken=authToken to the iframe URL
  // or use Rocket.Chat's postMessage login API
}
```

Returns `null` for non-Pexip providers or if credentials were not available.

## Provider Separation — JitsiBridge Guard

**File:** `src/videoCallWindow/preload/jitsiBridge.ts`

The JitsiBridge (Jitsi's External API integration) previously initialized unconditionally for all video call providers. This caused errors on Pexip calls because JitsiBridge's URL detection is broad and would falsely match Pexip URLs as Jitsi meetings, leading to failed `/external_api.js` loads and CORS errors.

The fix uses **synchronous IPC** to check the provider before initializing:

```typescript
const providerName = ipcRenderer.sendSync('video-call-window/get-provider-sync');

if (providerName && providerName !== 'jitsi') {
  // Skip JitsiBridge entirely for Pexip and other providers
} else {
  // Initialize JitsiBridge for Jitsi or unknown providers (backward compat)
  jitsiBridge = new JitsiBridgeImpl();
}
```

Synchronous IPC (`sendSync`) is used intentionally here — the provider check must complete before the preload script finishes executing, since JitsiBridge installs global hooks (like `JitsiMeetScreenObtainer`) during construction. An async check would allow the bridge to initialize before the result arrives.

The main process handles this via a standard `ipcMain.on` listener:

```typescript
ipcMain.on('video-call-window/get-provider-sync', (event) => {
  event.returnValue = videoCallProviderName;
});
```

## Multi-Workspace Support

The design handles multiple connected workspaces correctly:

1. **Isolated localStorage** — Each server webview runs in its own webContents with a separate origin. `localStorage.getItem('Meteor.loginToken')` reads from the specific workspace's storage.

2. **Server URL from calling webContents** — `_wc.getURL()` in the main process handler returns the URL of the webContents that sent the IPC message, not a global value.

3. **Singleton video call window** — Only one video call can be active at a time. The stored credentials always correspond to the current call's workspace. When the window closes, credentials are cleared.

## Security

| Aspect | Implementation |
|--------|---------------|
| **Provider-gated** | Credentials only captured when `providerName === 'pexip'` |
| **Memory-only** | Stored in module-level JS variables, never persisted to disk or Redux |
| **Lifecycle-scoped** | Cleared immediately when the video call window closes |
| **Context-isolated** | Exposed via `contextBridge.exposeInMainWorld` — the Pexip page cannot access `ipcRenderer` directly |
| **Origin-specific** | `serverUrl` is derived from the actual webContents URL, not user input |
| **No cross-provider leakage** | `get-credentials` returns `null` for Jitsi and other providers |

## IPC Channels

| Channel | Type | Direction | Purpose |
|---------|------|-----------|---------|
| `video-call-window/open-window` | `handle`/`invoke` | Renderer → Main | Opens video call window; carries credentials in options |
| `video-call-window/get-credentials` | `handle`/`invoke` | Preload → Main | Returns `{userId, authToken, serverUrl}` or `null` |
| `video-call-window/get-provider-sync` | `on`/`sendSync` | Preload → Main | Returns provider name synchronously for JitsiBridge guard |

## Files

| File | Role |
|------|------|
| `src/servers/preload/internalVideoChatWindow.ts` | Captures Meteor credentials from localStorage for Pexip calls |
| `src/ipc/channels.ts` | TypeScript type definitions for IPC channels |
| `src/videoCallWindow/ipc.ts` | Main process: stores credentials, serves them via IPC, clears on close |
| `src/videoCallWindow/preload/index.ts` | Webview preload: exposes `getAuthCredentials()` to Pexip page |
| `src/videoCallWindow/preload/jitsiBridge.ts` | Provider-aware guard: skips JitsiBridge for non-Jitsi providers |
