import { ipcRenderer } from 'electron';

/**
 * Jitsi Meet External API Interface
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
type JitsiMeetExternalAPI = {
  executeCommand(command: string, ...args: any[]): void;
  addListener(event: string, listener: (...args: any[]) => void): void;
  removeListener(event: string, listener: (...args: any[]) => void): void;
  dispose(): void;
  getIFrame(): HTMLIFrameElement;
  getParticipantsInfo(): any[];
  getVideoQuality(): string;
  isAudioMuted(): boolean;
  isVideoMuted(): boolean;
  getNumberOfParticipants(): number;
};

// eslint-disable-next-line @typescript-eslint/naming-convention
interface JitsiMeetExternalAPIConstructor {
  new (
    domain: string,
    options: JitsiMeetExternalAPIOptions
  ): JitsiMeetExternalAPI;
}

/**
 * Options for Jitsi Meet External API
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
interface JitsiMeetExternalAPIOptions {
  roomName?: string;
  width?: string | number;
  height?: string | number;
  parentNode?: Element;
  configOverwrite?: Record<string, any>;
  interfaceConfigOverwrite?: Record<string, any>;
  jwt?: string;
  onload?: () => void;
  invitees?: Array<Record<string, unknown>>;
  devices?: {
    audioInput?: string;
    audioOutput?: string;
    videoInput?: string;
  };
  userInfo?: {
    email?: string;
    displayName?: string;
  };
}

declare global {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  interface Window {
    JitsiMeetExternalAPI?: JitsiMeetExternalAPIConstructor;
    jitsiBridge?: JitsiBridge;
  }
}

/**
 * Interface for the Jitsi Bridge
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
interface JitsiBridge {
  initializeJitsiApi(config: JitsiBridgeConfig): Promise<boolean>;
  startScreenSharing(): Promise<boolean>;
  endCall(): void;
  getJitsiVersion(): Promise<string | null>;
  dispose(): void;
  isInitialized(): boolean;
  getApi(): JitsiMeetExternalAPI | null;
  getCurrentDomain(): string;
  getCurrentRoomName(): string;
}

/**
 * Configuration for Jitsi Bridge initialization
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
interface JitsiBridgeConfig {
  domain: string;
  roomName: string;
  displayName?: string;
  options?: Partial<JitsiMeetExternalAPIOptions>;
}

/**
 * JitsiBridge - Bridge between Electron application and Jitsi Meet's External API
 * Handles initialization, event handling, and screen sharing coordination
 */
class JitsiBridgeImpl implements JitsiBridge {
  private jitsiApi: JitsiMeetExternalAPI | null = null;

  private isApiInitialized = false;

  private domain = '';

  private roomName = '';

  // @ts-expect-error: variable is used in the implementation
  private displayName = '';

  // @ts-expect-error: variable is used in the implementation
  private options: Partial<JitsiMeetExternalAPIOptions> = {};

  private detectionInProgress = false;

  constructor() {
    console.log('JitsiBridge: Initializing detection mechanisms');
    // Install screen obtainer immediately so it's available before Jitsi's JS runs
    this.installScreenObtainer();
    this.setupDetection();
  }

  /**
   * Initialize detection mechanisms to automatically detect Jitsi meetings
   * and set up appropriate listeners
   */
  private setupDetection(): void {
    // Set up mutation observer to detect when Jitsi iframes are added to the DOM
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          this.detectJitsiMeeting();
        }
      }
    });

    // Start observing once DOM is loaded
    window.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, { childList: true, subtree: true });
      this.detectJitsiMeeting();
    });

    // Also check on page load
    window.addEventListener('load', () => {
      this.detectJitsiMeeting();
    });
  }

  /**
   * Detect if current page is a Jitsi meeting
   */
  private async detectJitsiMeeting(): Promise<void> {
    if (this.detectionInProgress || this.isApiInitialized) return;

    this.detectionInProgress = true;

    try {
      // Check URL for Jitsi patterns
      if (this.isJitsiMeetingUrl(window.location.href)) {
        console.log(
          'JitsiBridge: Detected Jitsi meeting URL:',
          window.location.href
        );

        // Parse domain and room name from URL
        const url = new URL(window.location.href);
        this.domain = url.hostname;
        this.roomName = this.extractRoomNameFromUrl(url);

        if (this.domain && this.roomName) {
          await this.initializeJitsiApi({
            domain: this.domain,
            roomName: this.roomName,
          });
        }
      }

      // Check for Jitsi iframes
      const jitsiIframes = this.findJitsiIframes();
      if (jitsiIframes.length > 0) {
        const iframe = jitsiIframes[0];
        console.log('JitsiBridge: Detected Jitsi iframe:', iframe);

        try {
          const frameUrl = new URL(iframe.src);
          this.domain = frameUrl.hostname;
          this.roomName = this.extractRoomNameFromUrl(frameUrl);

          if (this.domain && this.roomName) {
            await this.initializeJitsiApi({
              domain: this.domain,
              roomName: this.roomName,
              options: {
                parentNode: iframe.parentElement || undefined,
              },
            });
          }
        } catch (e) {
          console.error('JitsiBridge: Error parsing iframe URL:', e);
        }
      }
    } finally {
      this.detectionInProgress = false;
    }
  }

  /**
   * Find any iframes that might be Jitsi meetings
   */
  private findJitsiIframes(): HTMLIFrameElement[] {
    return Array.from(document.querySelectorAll('iframe')).filter((iframe) => {
      if (!iframe.src) return false;
      return this.isJitsiMeetingUrl(iframe.src);
    });
  }

  /**
   * Check if a URL is likely a Jitsi meeting
   */
  private isJitsiMeetingUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);

      // Check for known Jitsi hosts
      const knownJitsiHosts = ['meet.jit.si', '8x8.vc', 'jitsi.rocket.chat'];

      const isKnownHost = knownJitsiHosts.some(
        (host) =>
          parsedUrl.hostname === host || parsedUrl.hostname.endsWith(`.${host}`)
      );

      if (isKnownHost) return true;

      // Check URL patterns common in Jitsi deployments
      return (
        url.includes('/meet/') ||
        url.includes('/conference/') ||
        url.includes('?jwt=') ||
        !!parsedUrl.pathname.match(/\/[a-zA-Z0-9_-]{6,}$/)
      );
    } catch (e) {
      console.error('JitsiBridge: Error parsing URL:', e);
      return false;
    }
  }

  /**
   * Extract room name from a Jitsi URL
   */
  private extractRoomNameFromUrl(url: URL): string {
    // Different Jitsi deployments might have different URL patterns
    const pathParts = url.pathname.split('/').filter(Boolean);

    if (pathParts.length > 0) {
      // Most Jitsi deployments have the room name as the last path segment
      return pathParts[pathParts.length - 1];
    }

    return '';
  }

  /**
   * Initialize the Jitsi Meet External API
   */
  public async initializeJitsiApi(config: JitsiBridgeConfig): Promise<boolean> {
    if (this.isApiInitialized) {
      console.log('JitsiBridge: API already initialized');
      return true;
    }

    if (!config?.domain || !config.roomName) {
      console.error('JitsiBridge: Invalid configuration');
      return false;
    }

    // Store configuration
    this.domain = config.domain;
    this.roomName = config.roomName;
    this.displayName = config.displayName || '';
    this.options = config.options || {};

    try {
      // Load the external API script if needed
      if (!window.JitsiMeetExternalAPI) {
        await this.loadJitsiScript(this.domain);
      }

      console.log('JitsiBridge: Creating Jitsi Meet External API instance');

      // We don't actually create a new instance with the External API
      // because we don't want to create a new iframe when one might already exist
      // Instead, we just initialize our event listeners for the existing iframe

      // The screen obtainer is already installed in the constructor.
      // Set up message event listener for any other window messages.
      this.setupMessageEventListener();

      this.isApiInitialized = true;
      console.log(
        'JitsiBridge: Jitsi Meet External API initialized successfully'
      );

      return true;
    } catch (error) {
      console.error(
        'JitsiBridge: Error initializing Jitsi Meet External API:',
        error
      );
      return false;
    }
  }

  /**
   * Load the Jitsi Meet External API script
   */
  private async loadJitsiScript(domain: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      // Ensure we use https
      const protocol =
        window.location.protocol === 'https:' ? 'https:' : 'https:';
      script.src = `${protocol}//${domain}/external_api.js`;
      script.async = true;

      script.onload = () => {
        console.log('JitsiBridge: Jitsi Meet External API script loaded');
        resolve();
      };

      script.onerror = (error) => {
        console.error(
          'JitsiBridge: Error loading Jitsi Meet External API script:',
          error
        );
        reject(error);
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Set up window message event listener to communicate with the Jitsi iframe.
   * Note: screen sharing is handled via window.JitsiMeetScreenObtainer below,
   * not via postMessage, because lib-jitsi-meet calls openDesktopPicker() directly.
   */
  private setupMessageEventListener(): void {
    window.addEventListener(
      'message',
      (_event) => {
        // Reserved for future message-based integrations if needed.
      },
      false
    );
  }

  /**
   * Install the JitsiMeetScreenObtainer hook that lib-jitsi-meet calls when
   * the user clicks "Start Screen Sharing" in Electron mode.
   *
   * lib-jitsi-meet (ScreenObtainer.obtainScreenOnElectron) checks for
   * window.JitsiMeetScreenObtainer.openDesktopPicker and calls it with:
   *   openDesktopPicker(options, successCb, errorCb)
   *
   * successCb(sourceId, sourceType, screenShareAudio?) — source was selected
   * errorCb(error) — user cancelled or error occurred
   *
   * After receiving sourceId, Jitsi calls getUserMedia() with legacy
   * chromeMediaSource constraints, which bypasses Electron's getDisplayMedia
   * handler — so we must resolve the selection here.
   *
   * We install this on window immediately so it is available before Jitsi's
   * JS runs. If Jitsi has already set it, we wrap the existing implementation.
   */
  private installScreenObtainer(): void {
    // Track whether a picker request is currently in-flight to prevent
    // concurrent requests from creating duplicate IPC listeners.
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

      // Remove any stale listener before registering a new one
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

          // Determine source type from the ID prefix (e.g. 'screen:0:0' or 'window:123:0')
          const sourceType = sourceId.startsWith('window:')
            ? 'window'
            : 'screen';
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

    // Set on window so lib-jitsi-meet can call it directly
    (window as any).JitsiMeetScreenObtainer = { openDesktopPicker };
    console.log('JitsiBridge: JitsiMeetScreenObtainer installed');
  }

  /**
   * Start screen sharing (public interface, delegates to the obtainer hook).
   */
  public async startScreenSharing(): Promise<boolean> {
    // The actual flow is driven by lib-jitsi-meet calling
    // window.JitsiMeetScreenObtainer.openDesktopPicker() directly.
    // This method exists for API compatibility.
    return false;
  }

  /**
   * Send a message to the Jitsi iframe
   */
  private sendMessageToJitsiIframe(message: any): void {
    const jitsiIframes = document.querySelectorAll('iframe');
    for (const iframe of Array.from(jitsiIframes)) {
      if (iframe.src && this.isJitsiMeetingUrl(iframe.src)) {
        iframe.contentWindow?.postMessage(message, '*');
        console.log('JitsiBridge: Sent message to Jitsi iframe:', message);
        return;
      }
    }

    console.warn('JitsiBridge: No Jitsi iframe found to send message');
  }

  /**
   * End the current call
   */
  public endCall(): void {
    console.log('JitsiBridge: End call requested');

    if (this.jitsiApi) {
      this.jitsiApi.executeCommand('hangup');
    } else {
      this.sendMessageToJitsiIframe({
        type: 'hangup',
      });
    }

    this.dispose();
  }

  /**
   * Get the Jitsi Meet version (may not be supported by all deployments)
   */
  public async getJitsiVersion(): Promise<string | null> {
    if (!this.isApiInitialized) {
      return 'API not initialized';
    }

    // This functionality might not be available in all Jitsi deployments
    return 'Version not available';
  }

  /**
   * Dispose of the Jitsi Meet External API instance
   */
  public dispose(): void {
    console.log('JitsiBridge: Disposing');

    if (this.jitsiApi) {
      try {
        this.jitsiApi.dispose();
      } catch (e) {
        console.error('JitsiBridge: Error disposing Jitsi API:', e);
      }

      this.jitsiApi = null;
    }

    this.isApiInitialized = false;
  }

  /**
   * Check if the API is initialized
   */
  public isInitialized(): boolean {
    return this.isApiInitialized;
  }

  /**
   * Get the Jitsi API instance
   */
  public getApi(): JitsiMeetExternalAPI | null {
    return this.jitsiApi;
  }

  /**
   * Get the current domain
   */
  public getCurrentDomain(): string {
    return this.domain;
  }

  /**
   * Get the current room name
   */
  public getCurrentRoomName(): string {
    return this.roomName;
  }
}

// Create and expose the Jitsi Bridge
const jitsiBridge = new JitsiBridgeImpl();
window.jitsiBridge = jitsiBridge;

// Export as default for module usage
export default jitsiBridge;
