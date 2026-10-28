# E2EE local search: desktop design notes

This document records the rules that the desktop code follows for the local
search index of end-to-end encrypted (E2EE) messages. It is the tracked
reference for the bridge contract, the server identification and the folder
layout. When the code and this document differ, the code is correct, and this
document must change.

The web client (Rocket.Chat core) decrypts the messages, builds the index
documents and sends them to the desktop app through the bridge. The desktop
app stores the index on the device. No plaintext goes to the server.

## 1. Bridge contract

### 1.1 Type location

- The shared type is `ISearchIndexBackend` in the core package
  `@rocket.chat/desktop-api` (`packages/desktop-api/src/index.ts`). The
  `IRocketChatDesktop` type already lives there.
- The desktop copy is `src/e2eeSearch/types.ts` (`SearchIndexBackend`). Keep
  the two types the same. A change to either type changes the contract.

### 1.2 Bridge name and detection

- The bridge is `window.RocketChatDesktop.e2eeSearch`. It is optional. A
  desktop app without the feature does not expose it.
- The web client finds the bridge with a presence check
  (`getSearchIndexBackend.ts` in core). Then it calls `open`. The result of
  `open` tells the web client what the index can do.
- `close` came after the first version of the bridge. The web client must
  check that `close` exists before it calls it.

### 1.3 Methods

| Method                                          | What it does                                                                                                                  |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `open({ userId, wrapKey? })`                    | Opens the index of one user. Returns `schemaVersion`, `encryptedAtRest`, and optionally `store`, `limitedReason` or `locked`. |
| `upsert(docs)`                                  | Adds or replaces documents. The same `id` replaces the old document.                                                          |
| `remove(ids)`                                   | Removes documents.                                                                                                            |
| `removeRoom(rid)`                               | Removes all documents and the state of one room.                                                                              |
| `listRooms()`                                   | Returns the rooms that have rows in the index.                                                                                |
| `search(query)`                                 | Returns hits. An empty query text returns the newest documents that match the filters.                                        |
| `getRoomState(rid)`, `setRoomState(rid, state)` | Read and write the crawler cursor of one room.                                                                                |
| `stats()`                                       | Returns the count of documents, bytes and rooms.                                                                              |
| `wipe(scope?)`                                  | Deletes the index. With a scope and no open index (E2EE locked), it deletes the index of the user that the server confirms.   |
| `close()`                                       | Closes the index. The index stays on disk.                                                                                    |

### 1.4 Limits

The desktop app checks these limits in `src/e2eeSearch/validate.ts`. The web
client uses the same values (`searchIndexWriter.ts` and `toSearchDoc.ts` in
core).

| Limit                            | Value                                         |
| -------------------------------- | --------------------------------------------- |
| Documents in one `upsert`        | 500                                           |
| Body characters in one `upsert`  | 2 MiB (2,097,152)                             |
| Body characters in one document  | 64 KiB (65,536)                               |
| Length of an id                  | 128                                           |
| Length of a username             | 256                                           |
| Length of the query text         | 1,024                                         |
| Length of a crawler cursor       | 1,024                                         |
| Hits from one `search`           | 100. The app reduces a larger `limit` to 100. |
| Calls in flight from one webview | 32                                            |
| User indexes for one server      | 4                                             |

### 1.5 Errors

- A call that breaks a limit or has a wrong type rejects with
  `E2EESearchInputError`.
- A write that makes the index larger than its caps (bytes, documents or
  rooms, `src/e2eeSearch/engine.ts`) rejects with `E2EESearchQuotaError`.
- An `open` with a wrap key that does not open the index rejects with
  `E2EESearchKeyMismatchError`. The page learns nothing more.
- All other failures reject with the generic message
  `E2EE search call failed`. An error message never has a path, an
  index id or a user id.
- An `open` with no wrap key, for a user that has an E2EE key, returns
  `locked: true`. No index opens, and the app writes nothing. Each later call
  rejects until an `open` with the wrap key.
- The index searches FTS5 operators in the text (`NEAR(`, `OR`, `*`, `"`)
  as plain words. They do not cause an error.

### 1.6 Schema version and at-rest state

- `schemaVersion` is `1` (`src/e2eeSearch/schema.ts`).
- `encryptedAtRest: false` means that the index stays in memory only. It is
  lost when the app quits. `limitedReason` gives the cause, for example
  `basic-text-backend` on Linux. The web client shows a note to the user.

### 1.7 Contract tests

- Each desktop rule above has a main-process spec in `src/e2eeSearch/main/`.
- The core branch has a spec for the memory-only fake backend
  (`fakeSearchIndexBackend.spec.ts`).
- A contract suite that does not depend on a backend
  (`searchIndexBackendContract.ts`) is on the core branch of the browser
  backend. The browser backend ships in a later pull request. Move the suite
  into the main core branch when that work starts, so that the fake backend
  and the browser backend run the same cases.

## 2. Server identification

- The page never sends a server URL. The main process finds the server from
  the IPC sender (`resolveServerUrl` in `src/e2eeSearch/setup.ts`):
  1. The sender must be a webview.
  2. The sender frame must be the main frame of that webview.
  3. The webview must belong to a known server.
  4. The main frame must show a page of the origin of that server.
- If one of these checks fails, the call rejects with
  `E2EE search is available only to server webviews`.
- One server can never read or write the index of another server. Each
  server and user has a different folder (section 3).

### 2.1 Session lifetime

- An index session belongs to one document of one webview
  (`src/e2eeSearch/ipc.ts`).
- A navigation (`did-navigate`) or a reload ends the session. The new page
  must call `open` again before other calls.
- The end of the webview ends the session.
- A logout on the server ends the session, also when no navigation occurs.
- The first user id that a document opens stays bound to that document. A
  script on the page cannot change the document to the index of another
  user. A new document can bind again.
- The main process asks the server to confirm the user id on the login
  session of the webview before it opens the index.

### 2.2 Browser backend

- The browser has no main process. The origin of the page selects the
  storage (OPFS), so the browser itself keeps each server apart.
- The page also loses its in-memory index when it reloads. Thus the same
  rule applies: the web client calls `open` after each page load.

## 3. Folder layout

- The index root is `<userData>/e2ee-search/`.
- Each server has a folder named with the SHA-256 hex of the server URL.
- Each user has a folder in the server folder, named with the SHA-256 hex of
  the user id (`userDirName` in `src/e2eeSearch/lifecycle.ts`).

```text
<userData>/e2ee-search/
  <sha256(serverUrl)>/
    <sha256(userId)>/
      key.bin            index key, sealed by the OS keychain and the wrap key
      index.db           page-encrypted SQLite index (default store)
      index.bin          AES-256-GCM snapshot (snapshot store)
      owner-key.sha256   fingerprint of the E2EE public key that owns the index
```

- The default store is `index.db`. The snapshot store (`index.bin`) is the
  fallback when the native SQLite module is not available.
- User ids are case-sensitive. The default disks of macOS (APFS) and Windows
  (NTFS) are not. With raw ids, the users `ABC` and `abc` shared one folder.
  A hash gives each user a different folder. A hash is also never a Windows
  device name such as `CON`.

### 3.1 Folders with a raw user id

- Development builds before the hash change named the user folder with the
  raw user id. No release created these folders.
- Decision: no migration. The app does not read or delete these folders.
- Each such folder counts toward the limit of 4 user indexes for its server.
  "Clear local search index" in Settings, or the removal of the server,
  deletes it.
