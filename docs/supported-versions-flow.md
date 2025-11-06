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

## Validation Throttling (30-Minute Window)

To reduce expensive validation checks on every navigation, the app implements a **30-minute throttle** on the `isServerVersionSupported()` validation logic (independent from the 12-hour dialog suppression).

### How it Works

```mermaid
timeline
    title Validation Throttle Timeline
    0min: User navigates → Full validation runs
    0min: supportedVersionsValidatedAt = now
    10min: User navigates again → Check throttle
    10min: Time since last validation < 30min → SKIP validation
    10min: Still check 12-hour dialog suppression
    30min: User navigates → 30min has passed → Run full validation
    30min: supportedVersionsValidatedAt = now
    40min: User navigates → SKIP validation (within 30min window)
    12h: User navigates → Even within throttle, show dialog if suppression expired
```

### Throttle Behavior

| Navigation | Time Since Last Validation | Action |
|-----------|---------------------------|--------|
| First load | N/A | ✅ Run full validation |
| Within 30 minutes | < 30 min | ⏸️ Skip validation, check 12h timer |
| After 30 minutes | ≥ 30 min | ✅ Run full validation again |
| Dialog showing timing | Independent | ✅ Can show if 12h passed, even within throttle |

### Benefits

- **Reduces API load**: Validation runs at most once per 30 minutes per server
- **Maintains accuracy**: Fresh check every 30 minutes ensures data isn't stale
- **Preserves warning display**: 12-hour dialog suppression works independently
- **Navigation performance**: Repeated navigation within 30 min doesn't trigger expensive checks

### When Throttle is Bypassed

- ✅ Server reload (manual or forced) - Always validates fresh
- ✅ Server switch - Different server always validates
- ✅ Dialog dismissed - Triggers fetch, resets validation timer
- ✅ App startup (WEBVIEW_READY) - Always validates first time

---

## Modal Display Logic

The version support modal (warning dialog) appears independently from the blocking overlay. It shows version expiration information and is controlled by the `fetchState`:

```mermaid
graph TD
    Check{"Has version<br/>data available?"}

    Check -->|No| NoModal["❌ NO MODAL<br/>supportedVersions = undefined"]
    Check -->|Yes| CheckFetch

    CheckFetch{"Is data<br/>currently loading?"}

    CheckFetch -->|loading| NoModal2["❌ NO MODAL<br/>fetchState = loading<br/>Wait for data"]
    CheckFetch -->|not loading| HasModal

    HasModal["✅ SHOW MODAL<br/>if expiration warning exists<br/>(any data source: fresh, cached, builtin)"]

    style NoModal fill:#fff9c4
    style NoModal2 fill:#fff9c4
    style HasModal fill:#c8e6c9
```

**Modal shows when**:
- `supportedVersions` data exists AND
- `fetchState !== 'loading'` (not actively fetching) AND
- 12 hours have passed since last shown (independent timer) AND
- Server version is expiring soon (has expiration message)

**Modal skips when**:
- No data available (`supportedVersions` undefined)
- Currently fetching (`fetchState === 'loading'`)
- Within 12-hour display suppression window (shows max once per 12 hours)

**Data sources that trigger modal**:
- ✅ Fresh server data (`fetchState === 'success'`)
- ✅ Fresh cloud data (`fetchState === 'success'`)
- ✅ Stale cached data (`fetchState === 'error'`)
- ✅ Generic builtin fallback (`fetchState === 'error'`)

**Key difference from blocking overlay**:
- **Overlay blocks access** - only when definitely unsupported with fresh data
- **Modal warns users** - shows expiration info from any available data, but not while actively loading
- **Modal has separate suppression** - shows max once per 12 hours independent of validation throttle

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
  supportedVersionsValidatedAt?: Date,  // Timestamp of last validation (for 30-min throttle)

  // Warning display management
  expirationMessageLastTimeShown?: Date,  // 12-hour dialog suppression timer

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

**New field `supportedVersionsValidatedAt`**:
- Tracks when the last version validation check occurred
- Used to implement 30-minute validation throttle (see "Validation Throttling" section)
- Independent from the 12-hour dialog suppression timer

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

## URL Encoding & Cloud API Requirements

### URL Parameter Encoding

The app constructs API URLs with proper URL encoding to ensure reliable server communication:

```typescript
// Query parameter for uniqueID lookup (< v7.0.0)
// ✅ Properly encoded:
`${serverUrl}api/v1/settings.public?query=${encodeURIComponent(JSON.stringify({ _id: 'uniqueID' }))}`
// Results in: ?query=%7B%22_id%22%3A%20%22uniqueID%22%7D

// ❌ Would fail if unencoded (causes "Invalid query parameter" errors):
// `${serverUrl}api/v1/settings.public?query={"_id": "uniqueID"}`
```

**Why encoding matters**:
- Servers validate query parameters strictly
- Special characters in JSON (quotes, braces) must be URL-encoded
- Without encoding, older Rocket.Chat versions (especially v6.x) reject the request
- With proper encoding, all server versions handle it reliably

### Cloud API Domain Requirement

The Cloud API endpoint requires a valid **domain** (not IP address) to look up server-specific version policies:

```
https://releases.rocket.chat/v2/server/supportedVersions?domain={domain}&uniqueId={uniqueId}&source=desktop
```

**Domain requirement**:
- ✅ Works: `domain=chat.company.com`
- ✅ Works: `domain=ngrok-provided-url.ngrok.io` (tunneled service)
- ❌ Fails: `domain=192.168.1.100:3000` (IP addresses not recognized by Cloud API)
- ❌ Fails: `domain=192.168.1.100:3000:3620` (malformed)

**Workarounds for local/internal servers**:
1. Use a reverse proxy with domain routing (ngrok, Caddy, nginx)
2. Add DNS record pointing to the server IP
3. Configure local `/etc/hosts` entry if only for local access

**Impact when domain is unavailable**:
- Cloud API returns generic/default version policies
- Server may not be correctly identified
- Version validation uses fallback data (cache or builtin)
- May not reflect server-specific policies

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

### Fetch Scenarios

| Scenario | Server | Cloud | Cache | Builtin | Result | Time |
|----------|--------|-------|-------|---------|--------|------|
| Fast network | ✓ | - | - | - | Allow/Block based on data | ~1s |
| Slow server | ✗ | ✓ | - | - | Allow/Block based on data | ~7s |
| Offline + cache | ✗ | ✗ | ✓ | - | ALLOW (uncertain) | ~10s |
| Offline + no cache | ✗ | ✗ | ✗ | ✓ | Allow/Block based on builtin | ~12s |
| Airgapped | ✓ | ✗ | - | - | Allow/Block (Cloud skipped) | ~1s |

### Validation Throttle Scenarios

| Scenario | Last Validation | Time Elapsed | Action |
|----------|-----------------|--------------|--------|
| First navigation | None | N/A | ✅ Run full validation |
| Subsequent nav (quick) | 5 min ago | 5 min | ⏸️ Skip validation (within 30 min) |
| Subsequent nav (delayed) | 35 min ago | 35 min | ✅ Run validation (30 min passed) |
| Server reload | Any time | Any time | ✅ Always validate (bypass throttle) |
| Dialog dismissed | Any time | Any time | ✅ Always validate (bypass throttle) |

### Key Principles

1. **Blocking decision**: Block only on fresh `success` state with confirmed unsupported version. Allow on `loading` or `error` states.

2. **Validation throttle**: Expensive validation checks run max once per 30 minutes per server. Reduces API load while maintaining accuracy.

3. **Warning display**: Modal shows max once per 12 hours (independent of validation throttle). Can appear even within 30-minute validation window if 12 hours have passed.

4. **False positive prevention**: With proper URL encoding and Cloud API integration, supported servers no longer show false unsupported warnings due to transient failures.

5. **Fallback reliability**: Multiple fallback sources (cache, builtin) ensure users can always access servers, even in offline scenarios.
