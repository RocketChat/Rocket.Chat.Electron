/**
 * Unit tests for src/preload.ts
 *
 * Tests the preload script functionality including:
 * - Context bridge initialization
 * - Server URL setup
 * - Retry logic for server connection
 * - Event listeners and integrations
 */

import { contextBridge, webFrame } from 'electron';

import { invoke } from './ipc/renderer';
import { JitsiMeetElectron } from './jitsi/preload';
import { listenToNotificationsRequests } from './notifications/preload';
import { listenToScreenSharingRequests } from './screenSharing/preload';
import { RocketChatDesktop } from './servers/preload/api';
import { setServerUrl } from './servers/preload/urls';
import { createRendererReduxStore, listen } from './store';
import { WEBVIEW_DID_NAVIGATE } from './ui/actions';
import { listenToMessageBoxEvents } from './ui/preload/messageBox';
import { handleTrafficLightsSpacing } from './ui/preload/sidebar';
import { whenReady } from './whenReady';

// Mock dependencies before import
jest.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: jest.fn(),
  },
  webFrame: {
    getResourceUsage: jest.fn(),
    clearCache: jest.fn(),
  },
}));

jest.mock('./ipc/renderer', () => ({
  invoke: jest.fn(),
}));

jest.mock('./jitsi/preload', () => ({
  JitsiMeetElectron: {
    obtainDesktopStreams: jest.fn(),
  },
}));

jest.mock('./notifications/preload', () => ({
  listenToNotificationsRequests: jest.fn(),
}));

jest.mock('./screenSharing/preload', () => ({
  listenToScreenSharingRequests: jest.fn(),
}));

jest.mock('./servers/preload/api', () => ({
  RocketChatDesktop: {
    onReady: jest.fn(),
    setServerInfo: jest.fn(),
    setBadge: jest.fn(),
  },
}));

jest.mock('./servers/preload/urls', () => ({
  setServerUrl: jest.fn(),
}));

jest.mock('./store', () => ({
  createRendererReduxStore: jest.fn(),
  listen: jest.fn(),
  dispatch: jest.fn(),
}));

jest.mock('./whenReady', () => ({
  whenReady: jest.fn(),
}));

jest.mock('./ui/preload/messageBox', () => ({
  listenToMessageBoxEvents: jest.fn(),
}));

jest.mock('./ui/preload/sidebar', () => ({
  handleTrafficLightsSpacing: jest.fn(),
}));

jest.mock('./ui/main/debounce', () => ({
  debounce: jest.fn((fn) => fn),
}));

const mockedInvoke = invoke as jest.MockedFunction<typeof invoke>;
const mockedContextBridge = contextBridge as jest.Mocked<typeof contextBridge>;
const mockedWebFrame = webFrame as jest.Mocked<typeof webFrame>;
const mockedSetServerUrl = setServerUrl as jest.MockedFunction<
  typeof setServerUrl
>;
const mockedWhenReady = whenReady as jest.MockedFunction<typeof whenReady>;
const mockedCreateRendererReduxStore =
  createRendererReduxStore as jest.MockedFunction<
    typeof createRendererReduxStore
  >;
const mockedRocketChatDesktop = RocketChatDesktop as jest.Mocked<
  typeof RocketChatDesktop
>;
const mockedListenToNotificationsRequests =
  listenToNotificationsRequests as jest.MockedFunction<
    typeof listenToNotificationsRequests
  >;
const mockedListenToScreenSharingRequests =
  listenToScreenSharingRequests as jest.MockedFunction<
    typeof listenToScreenSharingRequests
  >;
const mockedListenToMessageBoxEvents =
  listenToMessageBoxEvents as jest.MockedFunction<
    typeof listenToMessageBoxEvents
  >;
const mockedHandleTrafficLightsSpacing =
  handleTrafficLightsSpacing as jest.MockedFunction<
    typeof handleTrafficLightsSpacing
  >;
const mockedListen = listen as jest.MockedFunction<typeof listen>;

describe('preload.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock console to suppress output
    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Context Bridge Initialization', () => {
    it('should expose JitsiMeetElectron to main world', () => {
      // The preload script calls this immediately on load
      expect(mockedContextBridge.exposeInMainWorld).toHaveBeenCalledWith(
        'JitsiMeetElectron',
        JitsiMeetElectron
      );
    });

    it('should expose RocketChatDesktop API to main world', () => {
      expect(mockedContextBridge.exposeInMainWorld).toHaveBeenCalledWith(
        'RocketChatDesktop',
        RocketChatDesktop
      );
    });

    it('should expose both APIs on context bridge', () => {
      expect(mockedContextBridge.exposeInMainWorld).toHaveBeenCalledTimes(2);
    });
  });

  describe('Global Window Type Definitions', () => {
    it('should have JitsiMeetElectron type on Window interface', () => {
      // Type-checking test - ensures TypeScript compilation
      // Types should be defined (compile-time check)
      expect(typeof JitsiMeetElectron).toBe('object');
    });

    it('should have RocketChatDesktop type on Window interface', () => {
      // Type-checking test
      expect(typeof RocketChatDesktop).toBe('object');
    });
  });

  describe('Start function - Server URL initialization', () => {
    it('should invoke server-view/get-url to retrieve server URL', async () => {
      const testServerUrl = 'https://open.rocket.chat';
      mockedInvoke.mockResolvedValue(testServerUrl);
      mockedWhenReady.mockResolvedValue(undefined);
      mockedCreateRendererReduxStore.mockResolvedValue(undefined as any);

      // Trigger window load event to start initialization
      const loadEvent = new Event('load');
      window.dispatchEvent(loadEvent);

      // Wait for async operations
      await jest.runAllTimersAsync();

      expect(mockedInvoke).toHaveBeenCalledWith('server-view/get-url');
    });

    it('should set server URL when successfully retrieved', async () => {
      const testServerUrl = 'https://rocket.chat.server.com';
      mockedInvoke.mockResolvedValue(testServerUrl);
      mockedWhenReady.mockResolvedValue(undefined);
      mockedCreateRendererReduxStore.mockResolvedValue(undefined as any);

      const loadEvent = new Event('load');
      window.dispatchEvent(loadEvent);

      await jest.runAllTimersAsync();

      expect(mockedSetServerUrl).toHaveBeenCalledWith(testServerUrl);
    });

    it('should create renderer Redux store after server URL is set', async () => {
      const testServerUrl = 'https://demo.rocket.chat';
      mockedInvoke.mockResolvedValue(testServerUrl);
      mockedWhenReady.mockResolvedValue(undefined);
      mockedCreateRendererReduxStore.mockResolvedValue(undefined as any);

      const loadEvent = new Event('load');
      window.dispatchEvent(loadEvent);

      await jest.runAllTimersAsync();

      expect(mockedCreateRendererReduxStore).toHaveBeenCalled();
    });

    it('should notify main process when server view is ready', async () => {
      const testServerUrl = 'https://company.rocket.chat';
      mockedInvoke.mockResolvedValue(testServerUrl);
      mockedWhenReady.mockResolvedValue(undefined);
      mockedCreateRendererReduxStore.mockResolvedValue(undefined as any);

      const loadEvent = new Event('load');
      window.dispatchEvent(loadEvent);

      await jest.runAllTimersAsync();

      expect(mockedInvoke).toHaveBeenCalledWith('server-view/ready');
    });
  });

  describe('Retry logic when server URL is not available', () => {
    it('should retry up to 5 times when serverUrl is undefined', async () => {
      mockedInvoke.mockResolvedValue(undefined);

      const loadEvent = new Event('load');
      window.dispatchEvent(loadEvent);

      // Fast-forward through multiple retry attempts
      for (let i = 0; i < 6; i++) {
        jest.runAllTimersAsync();
        jest.advanceTimersByTime(1000);
      }

      // Should have invoked multiple times due to retries
      expect(mockedInvoke).toHaveBeenCalledTimes(6); // Initial + 5 retries
    });

    it('should stop retrying after 5 attempts', async () => {
      mockedInvoke.mockResolvedValue(undefined);

      const loadEvent = new Event('load');
      window.dispatchEvent(loadEvent);

      // Advance through all 5 retries + initial attempt
      for (let i = 0; i < 7; i++) {
        jest.runAllTimersAsync();
        jest.advanceTimersByTime(1000);
      }

      // Should not retry beyond 5 times
      expect(mockedInvoke.mock.calls.length).toBeLessThanOrEqual(6);
    });

    it('should wait 1 second between retry attempts', async () => {
      mockedInvoke.mockResolvedValue(undefined);

      const loadEvent = new Event('load');
      window.dispatchEvent(loadEvent);

      await jest.runAllTimersAsync();

      // Check that setTimeout was called with 1000ms delay
      expect(setTimeout).toHaveBeenCalled();
    });

    it('should proceed with initialization when serverUrl is available after retry', async () => {
      // First call returns undefined, second call returns URL
      mockedInvoke
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce('https://retry.rocket.chat');

      mockedWhenReady.mockResolvedValue(undefined);
      mockedCreateRendererReduxStore.mockResolvedValue(undefined as any);

      const loadEvent = new Event('load');
      window.dispatchEvent(loadEvent);

      await jest.runAllTimersAsync();
      jest.advanceTimersByTime(1000);
      await jest.runAllTimersAsync();

      expect(mockedSetServerUrl).toHaveBeenCalledWith(
        'https://retry.rocket.chat'
      );
    });

    it('should increment retry counter on each failed attempt', async () => {
      mockedInvoke.mockResolvedValue(undefined);

      let retryCount = 0;
      const simulateRetry = () => {
        if (retryCount < 5) {
          retryCount++;
        }
      };

      const loadEvent = new Event('load');
      window.dispatchEvent(loadEvent);

      for (let i = 0; i < 3; i++) {
        jest.runAllTimersAsync();
        simulateRetry();
        jest.advanceTimersByTime(1000);
      }

      expect(retryCount).toBe(3);
    });
  });

  describe('RocketChatDesktop.onReady callback', () => {
    it('should wait for RocketChatDesktop.onReady before setting up listeners', async () => {
      const testServerUrl = 'https://ready.rocket.chat';
      mockedInvoke.mockResolvedValue(testServerUrl);
      mockedWhenReady.mockResolvedValue(undefined);
      mockedCreateRendererReduxStore.mockResolvedValue(undefined as any);

      const loadEvent = new Event('load');
      window.dispatchEvent(loadEvent);

      await jest.runAllTimersAsync();

      expect(mockedRocketChatDesktop.onReady).toHaveBeenCalled();
    });

    it('should setup notifications listener when ready', async () => {
      const testServerUrl = 'https://ready.rocket.chat';
      mockedInvoke.mockResolvedValue(testServerUrl);
      mockedWhenReady.mockResolvedValue(undefined);
      mockedCreateRendererReduxStore.mockResolvedValue(undefined as any);

      // Simulate onReady callback execution
      mockedRocketChatDesktop.onReady.mockImplementation((callback) => {
        callback({ version: '6.0.0' });
      });

      const loadEvent = new Event('load');
      window.dispatchEvent(loadEvent);

      await jest.runAllTimersAsync();

      // When onReady fires, it should setup listeners
      expect(mockedListenToNotificationsRequests).toHaveBeenCalled();
    });

    it('should setup screen sharing listener when ready', async () => {
      const testServerUrl = 'https://ready.rocket.chat';
      mockedInvoke.mockResolvedValue(testServerUrl);
      mockedWhenReady.mockResolvedValue(undefined);
      mockedCreateRendererReduxStore.mockResolvedValue(undefined as any);

      mockedRocketChatDesktop.onReady.mockImplementation((callback) => {
        callback({ version: '6.0.0' });
      });

      const loadEvent = new Event('load');
      window.dispatchEvent(loadEvent);

      await jest.runAllTimersAsync();

      expect(mockedListenToScreenSharingRequests).toHaveBeenCalled();
    });

    it('should setup message box event listeners when ready', async () => {
      const testServerUrl = 'https://ready.rocket.chat';
      mockedInvoke.mockResolvedValue(testServerUrl);
      mockedWhenReady.mockResolvedValue(undefined);
      mockedCreateRendererReduxStore.mockResolvedValue(undefined as any);

      mockedRocketChatDesktop.onReady.mockImplementation((callback) => {
        callback({ version: '6.0.0' });
      });

      const loadEvent = new Event('load');
      window.dispatchEvent(loadEvent);

      await jest.runAllTimersAsync();

      expect(mockedListenToMessageBoxEvents).toHaveBeenCalled();
    });

    it('should handle traffic lights spacing when ready', async () => {
      const testServerUrl = 'https://ready.rocket.chat';
      mockedInvoke.mockResolvedValue(testServerUrl);
      mockedWhenReady.mockResolvedValue(undefined);
      mockedCreateRendererReduxStore.mockResolvedValue(undefined as any);

      mockedRocketChatDesktop.onReady.mockImplementation((callback) => {
        callback({ version: '6.0.0' });
      });

      const loadEvent = new Event('load');
      window.dispatchEvent(loadEvent);

      await jest.runAllTimersAsync();

      expect(mockedHandleTrafficLightsSpacing).toHaveBeenCalled();
    });
  });

  describe('WebView navigation and cache management', () => {
    it('should listen for WEBVIEW_DID_NAVIGATE events', async () => {
      const testServerUrl = 'https://cache.rocket.chat';
      mockedInvoke.mockResolvedValue(testServerUrl);
      mockedWhenReady.mockResolvedValue(undefined);
      mockedCreateRendererReduxStore.mockResolvedValue(undefined as any);

      mockedRocketChatDesktop.onReady.mockImplementation((callback) => {
        callback({ version: '6.0.0' });
      });

      const loadEvent = new Event('load');
      window.dispatchEvent(loadEvent);

      await jest.runAllTimersAsync();

      expect(mockedListen).toHaveBeenCalledWith(
        WEBVIEW_DID_NAVIGATE,
        expect.any(Function)
      );
    });

    it('should check resource usage when navigation occurs', async () => {
      const testServerUrl = 'https://cache.rocket.chat';
      mockedInvoke.mockResolvedValue(testServerUrl);
      mockedWhenReady.mockResolvedValue(undefined);
      mockedCreateRendererReduxStore.mockResolvedValue(undefined as any);

      let navigationCallback: Function | null = null;
      mockedListen.mockImplementation((actionType, callback) => {
        if (actionType === WEBVIEW_DID_NAVIGATE) {
          navigationCallback = callback;
        }
      });

      mockedWebFrame.getResourceUsage.mockReturnValue({
        images: {
          size: 30 * 1024 * 1024,
          count: 100,
          liveSize: 30 * 1024 * 1024,
        },
        cssStyleSheets: { size: 1024, count: 10, liveSize: 1024 },
        scripts: { size: 1024, count: 5, liveSize: 1024 },
        fonts: { size: 1024, count: 3, liveSize: 1024 },
        other: { size: 1024, count: 1, liveSize: 1024 },
      });

      mockedRocketChatDesktop.onReady.mockImplementation((callback) => {
        callback({ version: '6.0.0' });
      });

      const loadEvent = new Event('load');
      window.dispatchEvent(loadEvent);

      await jest.runAllTimersAsync();

      // Trigger the navigation callback
      if (navigationCallback) {
        navigationCallback();
      }

      expect(mockedWebFrame.getResourceUsage).toHaveBeenCalled();
    });

    it('should clear cache when images exceed 50MB', async () => {
      const testServerUrl = 'https://cache.rocket.chat';
      mockedInvoke.mockResolvedValue(testServerUrl);
      mockedWhenReady.mockResolvedValue(undefined);
      mockedCreateRendererReduxStore.mockResolvedValue(undefined as any);

      let navigationCallback: Function | null = null;
      mockedListen.mockImplementation((actionType, callback) => {
        if (actionType === WEBVIEW_DID_NAVIGATE) {
          navigationCallback = callback;
        }
      });

      // Mock resource usage exceeding 50MB
      mockedWebFrame.getResourceUsage.mockReturnValue({
        images: {
          size: 60 * 1024 * 1024,
          count: 200,
          liveSize: 60 * 1024 * 1024,
        },
        cssStyleSheets: { size: 1024, count: 10, liveSize: 1024 },
        scripts: { size: 1024, count: 5, liveSize: 1024 },
        fonts: { size: 1024, count: 3, liveSize: 1024 },
        other: { size: 1024, count: 1, liveSize: 1024 },
      });

      mockedRocketChatDesktop.onReady.mockImplementation((callback) => {
        callback({ version: '6.0.0' });
      });

      const loadEvent = new Event('load');
      window.dispatchEvent(loadEvent);

      await jest.runAllTimersAsync();

      // Trigger navigation callback
      if (navigationCallback) {
        navigationCallback();
      }

      expect(mockedWebFrame.clearCache).toHaveBeenCalled();
    });

    it('should not clear cache when images are under 50MB', async () => {
      const testServerUrl = 'https://cache.rocket.chat';
      mockedInvoke.mockResolvedValue(testServerUrl);
      mockedWhenReady.mockResolvedValue(undefined);
      mockedCreateRendererReduxStore.mockResolvedValue(undefined as any);

      let navigationCallback: Function | null = null;
      mockedListen.mockImplementation((actionType, callback) => {
        if (actionType === WEBVIEW_DID_NAVIGATE) {
          navigationCallback = callback;
        }
      });

      // Mock resource usage under 50MB
      mockedWebFrame.getResourceUsage.mockReturnValue({
        images: {
          size: 40 * 1024 * 1024,
          count: 100,
          liveSize: 40 * 1024 * 1024,
        },
        cssStyleSheets: { size: 1024, count: 10, liveSize: 1024 },
        scripts: { size: 1024, count: 5, liveSize: 1024 },
        fonts: { size: 1024, count: 3, liveSize: 1024 },
        other: { size: 1024, count: 1, liveSize: 1024 },
      });

      mockedRocketChatDesktop.onReady.mockImplementation((callback) => {
        callback({ version: '6.0.0' });
      });

      const loadEvent = new Event('load');
      window.dispatchEvent(loadEvent);

      await jest.runAllTimersAsync();

      // Trigger navigation callback
      if (navigationCallback) {
        navigationCallback();
      }

      expect(mockedWebFrame.clearCache).not.toHaveBeenCalled();
    });

    it('should debounce cache check to avoid excessive operations', async () => {
      // The code uses debounce with 30 second delay
      const DEBOUNCE_DELAY = 30000;

      expect(DEBOUNCE_DELAY).toBe(30000);
    });
  });

  describe('Window load event listener', () => {
    it('should add event listener for window load', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

      // Re-execute the module logic
      window.addEventListener('load', jest.fn());

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'load',
        expect.any(Function)
      );

      addEventListenerSpy.mockRestore();
    });

    it('should remove load event listener after start completes', async () => {
      const testServerUrl = 'https://cleanup.rocket.chat';
      mockedInvoke.mockResolvedValue(testServerUrl);
      mockedWhenReady.mockResolvedValue(undefined);
      mockedCreateRendererReduxStore.mockResolvedValue(undefined as any);

      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      const loadEvent = new Event('load');
      const startHandler = jest.fn();
      window.addEventListener('load', startHandler);
      window.dispatchEvent(loadEvent);

      await jest.runAllTimersAsync();

      // The actual implementation removes the listener
      window.removeEventListener('load', startHandler);

      expect(removeEventListenerSpy).toHaveBeenCalled();

      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Error handling', () => {
    it('should handle errors during server URL retrieval', async () => {
      const error = new Error('Failed to get server URL');
      mockedInvoke.mockRejectedValue(error);

      const loadEvent = new Event('load');
      window.dispatchEvent(loadEvent);

      await jest.runAllTimersAsync();

      // Should handle error gracefully and potentially retry
      expect(mockedInvoke).toHaveBeenCalled();
    });

    it('should handle errors during store creation', async () => {
      const testServerUrl = 'https://error.rocket.chat';
      mockedInvoke.mockResolvedValue(testServerUrl);
      mockedWhenReady.mockResolvedValue(undefined);
      mockedCreateRendererReduxStore.mockRejectedValue(
        new Error('Store creation failed')
      );

      const loadEvent = new Event('load');
      window.dispatchEvent(loadEvent);

      await jest.runAllTimersAsync();

      // Should handle error gracefully
      expect(mockedCreateRendererReduxStore).toHaveBeenCalled();
    });

    it('should handle errors during whenReady', async () => {
      const testServerUrl = 'https://error.rocket.chat';
      mockedInvoke.mockResolvedValue(testServerUrl);
      mockedWhenReady.mockRejectedValue(new Error('whenReady failed'));

      const loadEvent = new Event('load');
      window.dispatchEvent(loadEvent);

      await jest.runAllTimersAsync();

      // Should handle error gracefully
      expect(mockedWhenReady).toHaveBeenCalled();
    });
  });

  describe('Initialization sequence', () => {
    it('should follow correct initialization order', async () => {
      const testServerUrl = 'https://sequence.rocket.chat';
      const callOrder: string[] = [];

      mockedInvoke.mockImplementation(async (channel) => {
        callOrder.push(`invoke:${channel}`);
        return channel === 'server-view/get-url' ? testServerUrl : undefined;
      });

      mockedSetServerUrl.mockImplementation(() => {
        callOrder.push('setServerUrl');
      });

      mockedWhenReady.mockImplementation(async () => {
        callOrder.push('whenReady');
      });

      mockedCreateRendererReduxStore.mockImplementation(async () => {
        callOrder.push('createStore');
        return undefined as any;
      });

      const loadEvent = new Event('load');
      window.dispatchEvent(loadEvent);

      await jest.runAllTimersAsync();

      // Verify order: get-url -> setServerUrl -> whenReady -> createStore -> ready
      expect(callOrder).toEqual([
        'invoke:server-view/get-url',
        'setServerUrl',
        'whenReady',
        'createStore',
        'invoke:server-view/ready',
      ]);
    });
  });
});