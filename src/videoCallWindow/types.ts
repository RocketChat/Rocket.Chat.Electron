/**
 * Type definitions for the video call window module
 * These types provide proper TypeScript support for Electron webview elements
 * and related APIs that don't have built-in type definitions.
 */

/**
 * Minimal DesktopCapturerSource type for renderer process
 * Matches Electron's DesktopCapturerSource interface
 */
export interface DesktopCapturerSource {
  id: string;
  name: string;
  thumbnailURL: string;
  appIconURL: string;
  display_id: string;
}

/**
 * Webview element extending HTMLElement with Electron-specific properties
 * Electron's webview tag has additional properties not in standard HTMLElement
 */
export interface WebviewElement extends HTMLElement {
  src: string;
  style: CSSStyleDeclaration;
  reload(): void;
  stop(): void;
  goBack(): void;
  goForward(): void;
  canGoBack(): boolean;
  canGoForward(): boolean;
  clearHistory(): void;
  executeJavaScript(code: string): Promise<unknown>;
  insertCSS(css: string): Promise<string>;
  removeInsertedCSS(key: string): Promise<void>;
  openDevTools(): void;
  closeDevTools(): void;
  isDevToolsOpened(): boolean;
  print(options?: Partial<PrintOptions>): Promise<void>;
  getURL(): string;
  getTitle(): string;
  isLoading(): boolean;
  isWaitingForResponse(): boolean;
  setAudioMuted(muted: boolean): void;
  isAudioMuted(): boolean;
  setUserAgent(userAgent: string): void;
  getUserAgent(): string;
  getWebContentsId(): number;
  partition: string;
  preload: string;
  httpreferrer: string;
  useragent: string;
  disablewebsecurity: boolean;
  allowpopups: boolean;
  webpreferences: string;
  blinkfeatures: string;
  disableblinkfeatures: string;
  guestinstance: string;
  plugins: boolean;
  autosize: boolean;
  minwidth: string;
  minheight: string;
  maxwidth: string;
  maxheight: string;
}

/**
 * Print options for webview.print()
 */
export interface PrintOptions {
  silent: boolean;
  printBackground: boolean;
  deviceName: string;
  color: boolean;
  marginsType: 'default' | 'none' | 'minimum';
  pageSize: string | { width: number; height: number };
  landscape: boolean;
  scaleFactor: number;
}

/**
 * Event payload for 'did-navigate' webview event
 */
export interface DidNavigateEvent {
  url: string;
  isMainFrame: boolean;
  frameProcessId: number;
  frameRoutingId: number;
  httpResponseCode: number;
  httpStatusText: string;
}

/**
 * Event payload for 'did-navigate-in-page' webview event
 */
export interface DidNavigateInPageEvent {
  url: string;
  isMainFrame: boolean;
  frameProcessId: number;
  frameRoutingId: number;
}

/**
 * Event payload for 'did-fail-load' webview event
 */
export interface DidFailLoadEvent {
  errorCode: number;
  errorDescription: string;
  validatedURL: string;
  isMainFrame: boolean;
}

/**
 * Event payload for 'did-start-loading' webview event
 */
export interface DidStartLoadingEvent {
  url: string;
  isMainFrame: boolean;
}

/**
 * Event payload for 'did-stop-loading' webview event
 */
export interface DidStopLoadingEvent {
  url: string;
  isMainFrame: boolean;
}

/**
 * Event payload for 'did-finish-load' webview event
 */
export interface DidFinishLoadEvent {
  url: string;
  isMainFrame: boolean;
}

/**
 * Event payload for 'dom-ready' webview event
 */
export interface DomReadyEvent {
  url: string;
  isMainFrame: boolean;
}

/**
 * Event payload for 'crashed' webview event
 */
export interface CrashedEvent {
  killed: boolean;
}

/**
 * Event payload for 'gpu-crashed' webview event
 */
export interface GpuCrashedEvent {
  killed: boolean;
  exitCode: number;
}

/**
 * Event payload for 'plugin-crashed' webview event
 */
export interface PluginCrashedEvent {
  name: string;
  version: string;
}

/**
 * Result object passed to DisplayMediaCallback when a source is selected
 */
export interface DisplayMediaSuccessResult {
  video: DesktopCapturerSource;
}

/**
 * Result object passed to DisplayMediaCallback when cancelled or failed
 */
export interface DisplayMediaFailureResult {
  video: false;
}

/**
 * Callback type for setDisplayMediaRequestHandler
 * Accepts either a success result with a DesktopCapturerSource,
 * or a failure result with video: false
 */
export type DisplayMediaCallback = (
  result: DisplayMediaSuccessResult | DisplayMediaFailureResult
) => void;

/**
 * Jitsi command types with their expected argument signatures
 */
export type JitsiCommand =
  | 'toggleAudio'
  | 'toggleVideo'
  | 'toggleShareScreen'
  | 'hangup'
  | 'email'
  | 'avatarUrl'
  | 'displayName'
  | 'password'
  | 'sendTones'
  | 'setAudioOnly'
  | 'setAudioOutputDevice'
  | 'setLargeVideoParticipant'
  | 'setMute'
  | 'setPassword'
  | 'setSubject'
  | 'setVideoQuality'
  | 'startRecording'
  | 'stopRecording'
  | 'toggleE2EE'
  | 'toggleLobby'
  | 'toggleSubtitles'
  | 'toggleTileView'
  | 'setAssumptionBandwidth'
  | 'muteEveryone'
  | 'muteEveryoneModeratorOnly'
  | 'grantModerator'
  | 'endConference';

/**
 * Jitsi event types
 */
export type JitsiEvent =
  | 'audioMuteStatusChanged'
  | 'videoMuteStatusChanged'
  | 'participantJoined'
  | 'participantLeft'
  | 'participantRoleChanged'
  | 'displayNameChange'
  | 'subjectChange'
  | 'passwordRequired'
  | 'videoConferenceLeft'
  | 'videoConferenceJoined'
  | 'readyToClose'
  | 'errorOccurred'
  | 'moderatorAnswered'
  | 'moderatorRequested'
  | 'moderatorRequestDenied'
  | 'knockingParticipant'
  | 'recordingLinkAvailable'
  | 'recordingStatusChanged'
  | 'screenSharingStatusChanged'
  | 'largeVideoChanged'
  | 'whiteboardStatusChanged';

/**
 * Participant info returned by Jitsi getParticipantsInfo()
 */
export interface JitsiParticipantInfo {
  participantId: string;
  displayName: string;
  email?: string;
  avatarURL?: string;
  role?: 'moderator' | 'participant' | 'none';
}

/**
 * Message sent to Jitsi iframe via postMessage
 */
export interface JitsiIframeMessage {
  type: string;
  [key: string]: unknown;
}

/**
 * Window extension for Jitsi Meet Screen Obtainer
 * This is the interface lib-jitsi-meet expects for Electron screen sharing
 */
export interface JitsiMeetScreenObtainer {
  openDesktopPicker: (
    options: { desktopSharingSources?: string[] },
    successCb: (
      sourceId: string,
      sourceType: string,
      screenShareAudio?: boolean
    ) => void,
    errorCb: (error: Error) => void
  ) => void;
}

/**
 * Extended Window interface for Jitsi integration
 */
declare global {
  interface Window {
    JitsiMeetScreenObtainer?: JitsiMeetScreenObtainer;
  }
}
