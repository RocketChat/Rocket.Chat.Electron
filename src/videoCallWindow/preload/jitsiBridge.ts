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

      // Set up event listeners on the window for iframe communication
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
   * Set up window message event listener to communicate with the Jitsi iframe
   */
  private setupMessageEventListener(): void {
    window.addEventListener(
      'message',
      (event) => {
        try {
          const { data } = event;

          // Handle screen sharing requests from Jitsi
          if (
            data &&
            typeof data === 'object' &&
            data.type === 'request-desktop-picker'
          ) {
            console.log(
              'JitsiBridge: Received screen sharing request from Jitsi'
            );
            this.handleScreenSharingRequest();
          }
        } catch (e) {
          console.error('JitsiBridge: Error handling message event:', e);
        }
      },
      false
    );
  }

  /**
   * Handle screen sharing requests from Jitsi
   */
  private handleScreenSharingRequest(): void {
    // Directly invoke the screen picker
    ipcRenderer.invoke('video-call-window/open-screen-picker').then(() => {
      // Listener for the selected source remains the same
      ipcRenderer.once(
        'video-call-window/screen-sharing-source-responded',
        (_event, sourceId) => {
          if (!sourceId) {
            console.log('JitsiBridge: Screen sharing cancelled');
            this.sendMessageToJitsiIframe({
              type: 'screen-sharing-canceled',
            });
            return;
          }

          console.log('JitsiBridge: Screen sharing source selected:', sourceId);

          // Send the selected source ID to Jitsi
          this.sendMessageToJitsiIframe({
            type: 'selected-screen-share-source',
            sourceId,
          });
        }
      );
    });
  }

  /**
   * Start screen sharing
   */
  public async startScreenSharing(): Promise<boolean> {
    console.log('JitsiBridge: Start screen sharing requested');

    try {
      // Direct invoke to screen picker
      await ipcRenderer.invoke('video-call-window/open-screen-picker');

      return new Promise<boolean>((resolve) => {
        ipcRenderer.once(
          'video-call-window/screen-sharing-source-responded',
          (_event, sourceId) => {
            if (!sourceId) {
              console.log('JitsiBridge: Screen sharing cancelled');
              resolve(false);
              return;
            }

            console.log(
              'JitsiBridge: Screen sharing source selected:',
              sourceId
            );

            // Send the selected source ID to Jitsi
            this.sendMessageToJitsiIframe({
              type: 'selected-screen-share-source',
              sourceId,
            });

            resolve(true);
          }
        );
      });
    } catch (error) {
      console.error('JitsiBridge: Error starting screen sharing:', error);
      return false;
    }
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
