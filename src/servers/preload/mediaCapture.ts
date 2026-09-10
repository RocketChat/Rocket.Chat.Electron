import { webFrame } from 'electron';

type TrackKind = 'camera' | 'microphone' | 'screen';

type MediaCaptureState = {
  camera: boolean;
  microphone: boolean;
  screen: boolean;
};

/**
 * Runs inside the page's main world (injected via `webFrame.executeJavaScript`
 * — see below) OR called directly in unit tests against a fake `window` /
 * `navigator`. Electron gives us no active-capture event, so the only
 * reliable signal is patching `getUserMedia`/`getDisplayMedia` and tracking
 * the returned MediaStreamTracks' lifecycle ourselves.
 *
 * Reused verbatim by the video-call window's preload — that is why it reports
 * through BOTH `window.RocketChatDesktop?.reportMediaCapture` (workspace
 * webview bridge) and `window.videoCallWindow?.reportMediaCapture` (video
 * call window bridge); whichever bridge exists in that page picks it up.
 *
 * Has no closed-over references outside the global `window`, since its
 * `.toString()` is executed verbatim in the page's main world by
 * `webFrame.executeJavaScript` (see `MEDIA_CAPTURE_HOOK_SCRIPT` below) — that
 * verbatim re-execution is what makes this dependency-free function safe to
 * ship as a string.
 */
export function installMediaCaptureHook(): void {
  const win = window as any;

  if (win.__rcDesktopMediaCaptureHooked) {
    return;
  }
  win.__rcDesktopMediaCaptureHooked = true;

  const tracks = new Set<{ track: any; kind: TrackKind }>();
  let lastReported: MediaCaptureState | null = null;

  const computeState = (): MediaCaptureState => {
    let camera = false;
    let microphone = false;
    let screen = false;
    tracks.forEach((entry) => {
      if (entry.track.readyState !== 'live') {
        return;
      }
      if (entry.kind === 'screen') {
        screen = true;
      } else if (entry.kind === 'camera') {
        camera = true;
      } else if (entry.kind === 'microphone') {
        microphone = true;
      }
    });
    return { camera, microphone, screen };
  };

  const report = (): void => {
    const state = computeState();
    if (
      lastReported &&
      lastReported.camera === state.camera &&
      lastReported.microphone === state.microphone &&
      lastReported.screen === state.screen
    ) {
      return;
    }
    lastReported = state;
    if (typeof win.RocketChatDesktop?.reportMediaCapture === 'function') {
      win.RocketChatDesktop.reportMediaCapture(state);
    }
    if (typeof win.videoCallWindow?.reportMediaCapture === 'function') {
      win.videoCallWindow.reportMediaCapture(state);
    }
  };

  const untrack = (mediaStreamTrack: any): void => {
    let removed = false;
    tracks.forEach((entry) => {
      if (entry.track === mediaStreamTrack) {
        tracks.delete(entry);
        removed = true;
      }
    });
    if (removed) {
      report();
    }
  };

  const trackKindFor = (
    kindLabelFor: 'userMedia' | 'screen',
    mediaStreamTrack: any
  ): TrackKind => {
    if (kindLabelFor === 'screen') {
      return 'screen';
    }
    return mediaStreamTrack.kind === 'video' ? 'camera' : 'microphone';
  };

  const track = (mediaStream: any, kindLabelFor: 'userMedia' | 'screen') => {
    mediaStream.getTracks().forEach((mediaStreamTrack: any) => {
      const kind = trackKindFor(kindLabelFor, mediaStreamTrack);
      tracks.add({ track: mediaStreamTrack, kind });
      mediaStreamTrack.addEventListener('ended', () => {
        untrack(mediaStreamTrack);
      });
    });
    report();
  };

  if (typeof win.MediaStreamTrack?.prototype?.stop === 'function') {
    const originalStop = win.MediaStreamTrack.prototype.stop;
    win.MediaStreamTrack.prototype.stop = function (this: any, ...args: any[]) {
      const result = originalStop.apply(this, args);
      untrack(this);
      return result;
    };
  }

  const mediaDevices = win.navigator?.mediaDevices;

  if (typeof mediaDevices?.getUserMedia === 'function') {
    const originalGetUserMedia = mediaDevices.getUserMedia;
    mediaDevices.getUserMedia = function (this: any, ...args: any[]) {
      return originalGetUserMedia.apply(this, args).then((stream: any) => {
        track(stream, 'userMedia');
        return stream;
      });
    };
  }

  if (typeof mediaDevices?.getDisplayMedia === 'function') {
    const originalGetDisplayMedia = mediaDevices.getDisplayMedia;
    mediaDevices.getDisplayMedia = function (this: any, ...args: any[]) {
      return originalGetDisplayMedia.apply(this, args).then((stream: any) => {
        track(stream, 'screen');
        return stream;
      });
    };
  }
}

/**
 * Self-contained IIFE string (`installMediaCaptureHook`'s source, wrapped in
 * an immediately-invoked call) injected into the page's main world via
 * `webFrame.executeJavaScript`. The function body has no free variables other
 * than the global `window`, so its `.toString()` re-executes correctly in
 * that separate JS context.
 */
export const MEDIA_CAPTURE_HOOK_SCRIPT = `(${installMediaCaptureHook.toString()})();`;

let injected = false;

/**
 * Injects the media-capture hook script into the workspace webview's page (its
 * main world) so we can observe getUserMedia/getDisplayMedia calls from the
 * preload's isolated context, where the page's `navigator` can't be patched
 * directly. Must run in preload, before the page's own scripts call into
 * `navigator.mediaDevices` — preload always runs first.
 */
export const listenToMediaCaptureReports = (): void => {
  if (injected) {
    return;
  }
  injected = true;

  webFrame.executeJavaScript(MEDIA_CAPTURE_HOOK_SCRIPT).catch((error) => {
    console.error(
      '[Rocket.Chat Desktop] Failed to inject media capture hook:',
      error
    );
  });
};
