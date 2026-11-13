# Windows notifications

How Windows desktop notifications behave, and the rules that keep quick
replies working. Read this before you change notification code. Full
investigation history:
[postmortem-notification-quick-reply-sup-1097.md](postmortem-notification-quick-reply-sup-1097.md).

- A Windows Action Center card stays repliable with no time limit. Electron
  emits the JS `close` event when the banner times out
  (`NotificationDismissed(should_destroy=false)`), and a call to `close()` on
  the instance does NOT remove the card.
  - Keep per-notification state (reply routing, target webContents, preload
    event handlers) until the app decides that the notification is finished.
    Keep that state bounded.
  - Do NOT tie that state to a `close` or dismiss signal. If you do, the app
    drops replies that the user types later.
- Web clients without Rocket.Chat PR #41897 close every desktop notification
  10s after they show it (`useNotification.ts`), because the server never
  sends `duration`. With those servers, expect that close while the card is
  still on screen. Web clients with #41897 do not close it.
- Only reply and action-button interactions carry activation arguments
  (`type=...&tag=<id>`, read through `Notification.handleActivation`, win32).
  A click on the toast body carries none and arrives ONLY as the instance
  `click` event. Keep that listener unconditional.
- `Notification.handleActivation` REPLACES the stored callback. It does not
  add one. A debug probe that registers its own handler silently unregisters
  the app's handler. Do not use such a probe to observe production behavior.
- Enter does NOT submit a toast reply. Only the Reply button of the toast
  does, and the card closes on submit whether or not the app received the
  reply. To check a reply, query the server for the message. Do not trust the
  UI.
- Log dropped activations through `loggers.notifications`
  (`src/logging/scopes.ts`). Packaged builds do not show `console.warn` from
  the main process, so a dropped reply would leave no trace in the field.
