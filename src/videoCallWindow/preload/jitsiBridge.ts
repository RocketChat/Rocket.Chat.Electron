import { ipcRenderer } from 'electron';

/**
 * Install the JitsiMeetScreenObtainer hook that lib-jitsi-meet calls when
 * the user clicks "Start Screen Sharing" in Electron mode.
 *
 * lib-jitsi-meet (ScreenObtainer.obtainScreenOnElectron) checks for
 * window.JitsiMeetScreenObtainer.openDesktopPicker and calls it with:
 *   openDesktopPicker(options, successCb, errorCb)
 *
 * After receiving sourceId, Jitsi calls getUserMedia() with legacy
 * chromeMediaSource constraints, which bypasses Electron's getDisplayMedia
 * handler — so we must resolve the selection here.
 */
function installScreenObtainer(): void {
  let isPending = false;

  const openDesktopPicker = (
    _options: { desktopSharingSources?: string[] },
    successCb: (
      sourceId: string,
      sourceType: string,
      screenShareAudio?: boolean
    ) => void,
    errorCb: (error: Error) => void
  ): void => {
    if (isPending) {
      console.warn(
        'JitsiBridge: openDesktopPicker called while already pending, ignoring'
      );
      errorCb(new Error('Screen sharing request already in progress'));
      return;
    }

    isPending = true;
    console.log('JitsiBridge: openDesktopPicker called by lib-jitsi-meet');

    ipcRenderer.removeAllListeners(
      'video-call-window/screen-sharing-source-responded'
    );

    const cleanup = () => {
      isPending = false;
      ipcRenderer.removeAllListeners(
        'video-call-window/screen-sharing-source-responded'
      );
    };

    ipcRenderer.on(
      'video-call-window/screen-sharing-source-responded',
      (_event, sourceId: string | null) => {
        cleanup();

        if (!sourceId) {
          console.log('JitsiBridge: Screen sharing cancelled by user');
          errorCb(new Error('gum.screensharing_user_canceled'));
          return;
        }

        const sourceType = sourceId.startsWith('window:') ? 'window' : 'screen';
        successCb(sourceId, sourceType);
      }
    );

    ipcRenderer
      .invoke('video-call-window/open-screen-picker')
      .catch((error: Error) => {
        console.error('JitsiBridge: Failed to open screen picker:', error);
        cleanup();
        errorCb(error);
      });
  };

  (window as any).JitsiMeetScreenObtainer = { openDesktopPicker };
  console.log('JitsiBridge: JitsiMeetScreenObtainer installed');
}

// Only install for Jitsi providers (not Pexip or others).
// Synchronous IPC so the hook is present before Jitsi's JS runs.
let providerName: string | null = null;
try {
  providerName = ipcRenderer.sendSync('video-call-window/get-provider-sync') as
    | string
    | null;
} catch {
  // Fallback: if sync IPC fails, assume Jitsi for backward compatibility
}

if (providerName && providerName !== 'jitsi') {
  console.log(
    `JitsiBridge: Skipping ScreenObtainer install for provider: ${providerName}`
  );
} else {
  installScreenObtainer();
}
