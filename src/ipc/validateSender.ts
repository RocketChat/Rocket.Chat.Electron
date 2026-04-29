import type { WebContents } from 'electron';

import { select } from '../store';
import type { RootState } from '../store/rootReducer';

export type SenderClass =
  | 'main-window'
  | 'log-viewer'
  | 'video-call'
  | 'server-webview';

type WindowGetter = () => WebContents | null | undefined;

const windowGetters = new Map<SenderClass, WindowGetter>();

/**
 * Register a getter that returns the trusted WebContents for a local window
 * class. Call this once during window setup. The getter is invoked at
 * validation time so it always reflects the current window instance.
 *
 * Not needed for 'server-webview' — those are validated via Redux state.
 */
export const registerWindowGetter = (
  cls: Exclude<SenderClass, 'server-webview'>,
  getter: WindowGetter
): void => {
  windowGetters.set(cls, getter);
};

/**
 * Returns true when `sender` is permitted to send on a channel that declares
 * the given `allow` list.
 *
 * - 'server-webview': sender must be a webview whose origin matches a
 *   configured server URL in Redux state.
 * - 'main-window' | 'log-viewer': sender must be exactly the registered
 *   WebContents for that window (identity-only match).
 * - 'video-call': sender must be exactly the registered WebContents OR a
 *   webview whose hostWebContents is that window's WebContents (covers the
 *   Jitsi webview hosted inside the video-call window).
 */
export const isTrustedSender = (
  sender: WebContents,
  allow: SenderClass[]
): boolean => {
  for (const cls of allow) {
    if (cls === 'server-webview' && isServerWebview(sender)) return true;
    if (cls !== 'server-webview' && isLocalWindowSender(sender, cls))
      return true;
  }
  return false;
};

const isServerWebview = (sender: WebContents): boolean => {
  if (sender.getType() !== 'webview') return false;
  try {
    const senderOrigin = new URL(sender.getURL()).origin;
    const servers = select((state: RootState) => state.servers);
    return servers.some((s) => {
      try {
        return s.url && new URL(s.url).origin === senderOrigin;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
};

const isLocalWindowSender = (
  sender: WebContents,
  cls: Exclude<SenderClass, 'server-webview'>
): boolean => {
  const getter = windowGetters.get(cls);
  if (!getter) return false;
  const trusted = getter();
  if (!trusted || trusted.isDestroyed()) return false;

  // Direct match: sender IS the window's webContents
  if (sender.id === trusted.id) return true;

  // Hosted webview match: only permitted for 'video-call' (Jitsi webview).
  // 'main-window' and 'log-viewer' use identity-only matching to prevent a
  // server webview (which shares hostWebContents with the main window) from
  // impersonating those classes.
  if (cls === 'video-call') {
    const host = (sender as WebContents & { hostWebContents?: WebContents })
      .hostWebContents;
    if (host && host.id === trusted.id) return true;
  }

  return false;
};
