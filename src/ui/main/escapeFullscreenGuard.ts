import type { Input, KeyboardInputEvent, WebContents } from 'electron';

/**
 * On macOS, Electron hands every key event the web content did not consume back
 * to the native window
 * (`WebContents::PlatformHandleKeyboardEvent` in `electron_api_web_contents_mac.mm`
 * calls `[ns_event.window redispatchKeyEvent:]`). AppKit answers ESC with
 * `cancelOperation:`, which on a window in native fullscreen leaves fullscreen.
 * That is why pressing ESC while a video is in HTML5 fullscreen — or with nothing
 * at all to dismiss — also drops the app out of fullscreen, while Chrome, which
 * never returns the raw `NSEvent` to AppKit, stays fullscreen.
 *
 * The only interception point is `before-input-event`, which runs before the
 * renderer sees the event. Preventing it there stops the redispatch, so the event
 * is replayed through `sendInputEvent`: a synthetic event carries no `NSEvent` and
 * therefore can never reach AppKit, while the page still receives its ESC.
 *
 * Windows and Linux redispatch to registered window accelerators only, and no ESC
 * accelerator exists, so the guard is inert there.
 */

const REPLAY_TIMEOUT_MS = 250;

type KeyboardModifier = NonNullable<KeyboardInputEvent['modifiers']>[number];

const toKeyboardModifiers = (input: Input): KeyboardModifier[] => {
  const modifiers: KeyboardModifier[] = [];

  if (input.shift) {
    modifiers.push('shift');
  }

  if (input.control) {
    modifiers.push('control');
  }

  if (input.alt) {
    modifiers.push('alt');
  }

  if (input.meta) {
    modifiers.push('meta');
  }

  if (input.isAutoRepeat) {
    modifiers.push('isautorepeat');
  }

  return modifiers;
};

type EscapeFullscreenGuard = {
  /**
   * Returns `true` when the caller must call `event.preventDefault()` on the
   * `before-input-event` it is handling.
   */
  handleInput: (input: Input) => boolean;
};

export const createEscapeFullscreenGuard = (
  target: Pick<WebContents, 'sendInputEvent'>,
  isWindowFullscreen: () => boolean,
  now: () => number = Date.now
): EscapeFullscreenGuard => {
  let pendingReplays = 0;
  let pendingReplaysExpireAt = 0;

  const isReplay = (): boolean => {
    if (pendingReplays === 0) {
      return false;
    }

    if (now() > pendingReplaysExpireAt) {
      pendingReplays = 0;
      return false;
    }

    pendingReplays -= 1;
    return true;
  };

  return {
    handleInput: (input) => {
      if (process.platform !== 'darwin') {
        return false;
      }

      if (input.type !== 'keyDown' || input.key !== 'Escape') {
        return false;
      }

      if (!isWindowFullscreen()) {
        return false;
      }

      if (isReplay()) {
        return false;
      }

      pendingReplays += 1;
      pendingReplaysExpireAt = now() + REPLAY_TIMEOUT_MS;

      if (process.env.NODE_ENV === 'development') {
        console.debug('Replaying Escape to keep the window in fullscreen');
      }

      target.sendInputEvent({
        type: 'keyDown',
        keyCode: 'Escape',
        modifiers: toKeyboardModifiers(input),
      });

      return true;
    },
  };
};
