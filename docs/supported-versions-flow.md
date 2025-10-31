# Version Support Data Loading & Caching Architecture

## Overview

This document describes how the desktop app fetches, caches, and uses version support data from Rocket.Chat servers. The system implements smart retry logic with per-server caching to handle network issues gracefully.

**Key principle**: Block users only when we have **definitive proof** that their server version is unsupported. Allow access during data loading and when using fallback sources.

---

## State Machine Flow

The fetch process follows a state machine with 4 states:

```mermaid
stateDiagram-v2
    [*] --> idle

    idle --> loading: updateSupportedVersionsData()

    loading --> success: Server/Cloud returns valid data
    loading --> error: All sources fail, use fallback

    success --> loading: Manual refresh or retry
    error --> loading: Retry after delay

    success --> [*]
    error --> [*]

    note right of idle
        Initial state, no data fetched yet
    end note

    note right of loading
        Fetching from Server/Cloud
        User NOT blocked
    end note

    note right of success
        Fresh data from Server or Cloud
        Apply blocking if unsupported
    end note

    note right of error
        Using fallback (cache or builtin)
        Allow access (uncertain data)
    end note
```

---

## Complete Fetch Sequence

```mermaid
flowchart TD
    Start["User opens server<br/>fetchState = loading"] --> CheckServer{"Retry Server<br/>3x with 2s delay"}

    CheckServer -->|Success| ServerOK["Use Server data<br/>Save to localStorage<br/>fetchState = success"]
    ServerOK --> Dispatch1["Dispatch UPDATED<br/>Done"]

    CheckServer -->|All 3 fail| CheckCloud{"Retry Cloud<br/>3x with 2s delay"}

    CheckCloud -->|Success| CloudOK["Use Cloud data<br/>Save to localStorage<br/>fetchState = success"]
    CloudOK --> Dispatch2["Dispatch UPDATED<br/>Done"]

    CheckCloud -->|All 3 fail| CheckCache{"Try localStorage<br/>supportedVersions:url"}

    CheckCache -->|Found| CacheOK["Use Cached data<br/>fetchState = error"]
    CacheOK --> Dispatch3["Dispatch UPDATED<br/>Allow access"]

    CheckCache -->|Not found| UseBuiltin["Use Builtin data<br/>fetchState = error"]
    UseBuiltin --> Dispatch3

    Dispatch1 --> EvalBlock
    Dispatch2 --> EvalBlock
    Dispatch3 --> EvalBlock

    EvalBlock{"Blocking Decision<br/>isSupported === false<br/>AND<br/>fetchState !== loading"}

    EvalBlock -->|No| AllowAccess["✅ ALLOW ACCESS<br/>User can access webview"]
    EvalBlock -->|Yes| BlockAccess["❌ BLOCK ACCESS<br/>Show UnsupportedServer overlay"]

    style Start fill:#e1f5ff
    style ServerOK fill:#c8e6c9
    style CloudOK fill:#c8e6c9
    style CacheOK fill:#fff9c4
    style UseBuiltin fill:#fff9c4
    style AllowAccess fill:#c8e6c9
    style BlockAccess fill:#ffcdd2
```

---

## Retry Logic Detail

Each source (Server and Cloud) is retried 3 times with 2-second delays:

```mermaid
sequenceDiagram
    participant Desktop
    participant Server
    participant Delay

    Desktop->>+Server: Attempt 1 (fetch)
    Server-->>-Desktop: Timeout/Error
    Desktop->>Delay: Wait 2 seconds
    Delay-->>Desktop: ✓ Ready

    Desktop->>+Server: Attempt 2 (fetch)
    Server-->>-Desktop: Timeout/Error
    Desktop->>Delay: Wait 2 seconds
    Delay-->>Desktop: ✓ Ready

    Desktop->>+Server: Attempt 3 (fetch)
    Server-->>-Desktop: Timeout/Error
    Desktop->>Delay: Move to Cloud
```

**Total wait per source**: Up to 6 seconds (3 attempts × 2s delays)

---

## Blocking Decision Logic

```mermaid
graph TD
    Check{"Is server<br/>unsupported?"}

    Check -->|isSupported = true| Allow["✅ ALLOW"]
    Check -->|isSupported = false| CheckState

    CheckState{"What is<br/>fetchState?"}

    CheckState -->|loading| Allow2["✅ ALLOW<br/>Still fetching, not proven"]
    CheckState -->|success| Block["❌ BLOCK<br/>Fresh data confirms unsupported"]
    CheckState -->|error| Block2["❌ BLOCK<br/>Even fallback confirms unsupported"]

    style Allow fill:#c8e6c9
    style Allow2 fill:#c8e6c9
    style Block fill:#ffcdd2
    style Block2 fill:#ffcdd2
```

---

## Per-Server State Structure

```typescript
// Redux state for each server
{
  url: "https://chat.example.com",
  version: "7.1.0",

  // Version support data
  supportedVersionsData: SupportedVersions | undefined,
  supportedVersionsFetchState: 'idle' | 'loading' | 'success' | 'error',
  isSupportedVersion: boolean | undefined,

  // Other fields...
  title: string,
  failed: boolean,
  // ...
}

// localStorage structure (per server)
localStorage['supportedVersions:https://chat.example.com'] = {
  versions: [...],
  exceptions: {...},
  timestamp: "2024-10-31T...",
  enforcementStartDate: "2024-11-15T..."
}
```

---

## Scenario Examples

### Scenario 1: Fast Network (Server Responds)

```mermaid
timeline
    title Fast Network - Server Available
    0s: User opens server → fetchState = loading
    1s: Server responds ✓
    1s: Save to localStorage
    1s: fetchState = success
    1s: Evaluate blocking
    1s: User sees webview (or overlay if unsupported)
```

**Total time**: ~1 second

---

### Scenario 2: Slow Server + Fast Cloud

```mermaid
timeline
    title Slow Server - Cloud Available
    0s: User opens server → fetchState = loading
    2s: Server attempt 1 timeout
    2s: Wait 2s
    4s: Server attempt 2 timeout
    4s: Wait 2s
    6s: Server attempt 3 timeout
    6s: Try Cloud
    7s: Cloud responds ✓
    7s: Save to localStorage
    7s: fetchState = success
    7s: User sees webview
```

**Total time**: ~7 seconds

---

### Scenario 3: Offline with Cached Data

```mermaid
timeline
    title Offline - Cache Available
    0s: User opens server → fetchState = loading
    2s: Server attempt 1 timeout
    2s: Wait 2s
    4s: Server attempt 2 timeout
    4s: Wait 2s
    6s: Server attempt 3 timeout
    6s: Try Cloud
    8s: Cloud timeout (no network)
    8s: Try Cloud attempt 2
    10s: Cloud timeout again
    10s: Try localStorage
    10s: Found cached data ✓
    10s: fetchState = error
    10s: User sees webview (using cache)
```

**Total time**: ~10 seconds
**Result**: User can work, using last-known-good data

---

### Scenario 4: Offline + No Cache + Builtin Blocks

```mermaid
timeline
    title Offline, No Cache, Unsupported
    0s: User opens server → fetchState = loading
    6s: Server retries fail
    12s: Cloud retries fail
    12s: localStorage check → not found
    12s: Use Builtin
    12s: Builtin says unsupported
    12s: fetchState = error
    12s: Blocking condition met
    12s: UnsupportedServer overlay shown
```

**Total time**: ~12 seconds
**Result**: User blocked (builtin confirms unsupported)

---

### Scenario 5: Airgapped Network (Server Available)

```mermaid
timeline
    title Airgapped - Local Server Only
    0s: User opens server → fetchState = loading
    1s: Server responds ✓
    1s: Save to localStorage
    1s: fetchState = success
    1s: Cloud not attempted (server succeeded)
    1s: User sees webview
```

**Total time**: ~1 second
**Key**: Cloud retries skipped because Server already succeeded

---

## Data Flow Architecture

```mermaid
graph LR
    A["Update triggered<br/>(WEBVIEW_READY,<br/>manual refresh)"]

    A --> B["Dispatch<br/>LOADING"]
    B --> C["Set fetchState<br/>= loading"]

    C --> D["updateSupportedVersionsData()<br/>Start fetch sequence"]

    D --> E1["Retry Server<br/>3x with delays"]
    E1 -->|Success| F["Dispatch UPDATED<br/>fetchState = success"]
    E1 -->|Fail| E2["Retry Cloud<br/>3x with delays"]

    E2 -->|Success| F
    E2 -->|Fail| E3["Load localStorage"]

    E3 -->|Found| G["Dispatch UPDATED<br/>fetchState = error"]
    E3 -->|Not found| E4["Use Builtin<br/>always available"]
    E4 --> G

    F --> H["Update Redux state"]
    G --> H

    H --> I["Component re-renders"]
    I --> J{"Blocking<br/>condition?"}

    J -->|No| K["Show webview"]
    J -->|Yes| L["Show UnsupportedServer<br/>overlay"]

    style A fill:#e1f5ff
    style B fill:#e1f5ff
    style C fill:#e1f5ff
    style D fill:#fff3e0
    style E1 fill:#fff3e0
    style E2 fill:#fff3e0
    style E3 fill:#fff9c4
    style E4 fill:#fff9c4
    style F fill:#c8e6c9
    style G fill:#fff9c4
    style H fill:#e1f5ff
    style K fill:#c8e6c9
    style L fill:#ffcdd2
```

---

## Component Integration

```mermaid
graph TD
    SV["ServersView<br/>maps servers"]
    SP["ServerPane<br/>per server UI"]
    US["UnsupportedServer<br/>overlay component"]

    SV --> SP
    SP --> US

    Props["Props passed down:<br/>- isSupportedVersion<br/>- supportedVersionsFetchState"]

    SP -.->|passes| Props
    Props --> US

    US --> Logic["if fetchState !== 'loading'<br/>AND isSupported === false<br/>→ show overlay"]

    style SV fill:#e1f5ff
    style SP fill:#e3f2fd
    style US fill:#f3e5f5
    style Logic fill:#ffcdd2
```

---

## Cache Management

### Storage Strategy

- **Key format**: `supportedVersions:${serverUrl}`
- **Value**: Complete `SupportedVersions` object with timestamp
- **Per-server**: Each server has its own cache entry
- **On success**: Automatically saved to localStorage
- **On failure**: Automatically loaded if available

### Lifecycle

```mermaid
stateDiagram-v2
    [*] --> NoCache: App loads<br/>no data

    NoCache --> Fetch: User opens server
    Fetch --> Success: Server/Cloud succeeds
    Fetch --> NoCacheFail: All fail

    Success --> Cached: Save to localStorage

    NoCacheFail --> Builtin: Use builtin
    Builtin --> Cached2: If builtin saved

    Cached --> Ready: Data available
    Cached2 --> Ready

    Ready --> UseCached: On next open<br/>or on fetch fail
    UseCached --> Ready

    note right of Cached
        Data persists across
        app sessions
    end note

    note right of UseCached
        Faster recovery on
        network issues
    end note
```

---

## Summary

| Scenario | Server | Cloud | Cache | Builtin | Result | Time |
|----------|--------|-------|-------|---------|--------|------|
| Fast network | ✓ | - | - | - | Allow/Block based on data | ~1s |
| Slow server | ✗ | ✓ | - | - | Allow/Block based on data | ~7s |
| Offline + cache | ✗ | ✗ | ✓ | - | ALLOW (uncertain) | ~10s |
| Offline + no cache | ✗ | ✗ | ✗ | ✓ | Allow/Block based on builtin | ~12s |
| Airgapped | ✓ | ✗ | - | - | Allow/Block (Cloud skipped) | ~1s |

**Key principle**: Block only on fresh `success` state. Allow on `loading` or `error` states.
