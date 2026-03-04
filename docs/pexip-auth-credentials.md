# Pexip Video Call — Auth Credentials for Persistent Chat

## Overview

When a Pexip video call is opened from the Rocket.Chat Electron desktop app, the app automatically captures the logged-in user's authentication credentials and makes them available to the Pexip page. Pexip can use these credentials to authenticate the embedded Rocket.Chat iframe for persistent chat.

## How It Works

```
┌──────────────────────────────────────────────────────────┐
│  Rocket.Chat Desktop App                                  │
│  ├── User is logged in to workspace                       │
│  ├── User starts a Pexip video call                       │
│  ├── App captures userId + authToken automatically        │
│  └── Opens Pexip in a dedicated video call window         │
├──────────────────────────────────────────────────────────┤
│  Pexip Page (inside video call window)                    │
│  └── Calls window.videoCallWindow.getAuthCredentials()    │
│       → Returns { userId, authToken, serverUrl }          │
│  └── Uses credentials to authenticate the RC iframe       │
└──────────────────────────────────────────────────────────┘
```

## API

### `window.videoCallWindow.getAuthCredentials()`

Returns a Promise that resolves to the user's credentials or `null`.

**Signature:**

```typescript
getAuthCredentials(): Promise<{
  userId: string;
  authToken: string;
  serverUrl: string;
} | null>
```

**Response fields:**

| Field       | Type     | Description                                                             |
| ----------- | -------- | ----------------------------------------------------------------------- |
| `userId`    | `string` | The Rocket.Chat user ID of the logged-in user                           |
| `authToken` | `string` | The Meteor login token (session token) for the user                     |
| `serverUrl` | `string` | The origin of the Rocket.Chat server (e.g., `https://chat.example.com`) |

Returns `null` if credentials are not available.

## Multi-Workspace Support

The credentials are always captured from the specific Rocket.Chat workspace that initiated the video call. If the user is connected to multiple workspaces, the correct `userId`, `authToken`, and `serverUrl` for the calling workspace are returned.

## Lifecycle

- Credentials are captured at the moment the Pexip call is opened
- They are held in memory only (never written to disk)
- They are cleared immediately when the video call window closes
- Each new call captures fresh credentials
