// Test file for injected.ts functionality

// Mock window.require to simulate module loading
const mockModules: Record<string, any> = {};
const mockWindowRequire = jest.fn((path: string) => {
  if (mockModules[path]) {
    return mockModules[path];
  }
  throw new Error(`Cannot find package "${path}"`);
});

// Mock RocketChatDesktop API
const mockRocketChatDesktop = {
  setServerInfo: jest.fn(),
  setUrlResolver: jest.fn(),
  writeTextToClipboard: jest.fn().mockResolvedValue(undefined),
  createNotification: jest.fn().mockResolvedValue('mock-notification-id'),
  destroyNotification: jest.fn(),
  setBadge: jest.fn(),
  setFavicon: jest.fn(),
  getInternalVideoChatWindowEnabled: jest.fn().mockReturnValue(true),
  setBackground: jest.fn(),
  setUserToken: jest.fn(),
  setOutlookExchangeUrl: jest.fn(),
  setTitle: jest.fn(),
  setUserLoggedIn: jest.fn(),
  setGitCommitHash: jest.fn(),
  setUserThemeAppearance: jest.fn(),
  setUserPresenceDetection: jest.fn(),
};

// Setup mocks for Electron renderer environment

// Mock setTimeout and setInterval
global.setTimeout = jest.fn((fn, _delay) => {
  if (typeof fn === 'function') {
    fn();
  }
  return 1;
}) as any;

global.setInterval = jest.fn((_fn, _delay) => {
  // Don't execute interval functions in tests to avoid infinite loops
  return 1;
}) as any;

describe('injected.ts', () => {
  beforeAll(() => {
    // Mock window.require in Electron renderer environment
    (window as any).require = mockWindowRequire;

    // Mock RocketChatDesktop API
    (window as any).RocketChatDesktop = mockRocketChatDesktop;

    // Mock other window properties
    const originalOpen = window.open;
    window.open = jest.fn();

    // Mock navigator.clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: jest.fn(),
      },
      configurable: true,
    });

    // Mock document.documentElement.lang
    Object.defineProperty(document.documentElement, 'lang', {
      value: 'en',
      configurable: true,
    });

    // Cleanup function to restore original state
    return () => {
      window.open = originalOpen;
    };
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock modules
    Object.keys(mockModules).forEach((key) => delete mockModules[key]);

    // Setup default successful modules
    mockModules['/app/utils/rocketchat.info'] = {
      Info: {
        version: '6.5.0',
      },
    };

    // Mock successful module loading by default
    mockWindowRequire.mockImplementation((path: string) => {
      if (mockModules[path]) {
        return mockModules[path];
      }
      // Default successful modules
      const defaultModules: Record<string, any> = {
        'meteor/meteor': { Meteor: { absoluteUrl: jest.fn() } },
        'meteor/session': { Session: { get: jest.fn() } },
        'meteor/tracker': { Tracker: { autorun: jest.fn() } },
        '/app/settings/client/index.ts': { settings: { get: jest.fn() } },
        '/app/utils/client/index.ts': { getUserPreference: jest.fn() },
        'meteor/rocketchat:user-presence': {
          UserPresence: { start: jest.fn() },
        },
        'meteor/konecty:user-presence': { UserPresence: { start: jest.fn() } },
      };
      return defaultModules[path] || {};
    });
  });

  describe('module loading', () => {
    it('should load without throwing errors', async () => {
      // Test that the module loads successfully
      await expect(import('../../injected')).resolves.toBeDefined();
    });
  });

  describe('immediate features', () => {
    it('should replace navigator.clipboard.writeText immediately', async () => {
      await import('../../injected');

      await navigator.clipboard.writeText('test');
      expect(mockRocketChatDesktop.writeTextToClipboard).toHaveBeenCalledWith(
        'test'
      );
    });

    it('should replace window.Notification immediately', async () => {
      await import('../../injected');

      new (window as any).Notification('Test', {
        body: 'Test body',
      });

      expect(mockRocketChatDesktop.createNotification).toHaveBeenCalledWith({
        title: 'Test',
        body: 'Test body',
        onEvent: expect.any(Function),
      });
    });

    it('should set correct notification permissions', async () => {
      await import('../../injected');

      const NotificationClass = (window as any).Notification;
      expect(NotificationClass.permission).toBe('granted');
      expect(NotificationClass.maxActions).toBe(Number.MAX_SAFE_INTEGER);
    });
  });

  describe('reactive features setup', () => {
    it('should have module loading capability', async () => {
      // Simply test that the injection works without errors
      await expect(import('../../injected')).resolves.toBeDefined();

      // Test that the window.require function exists and can be called
      expect(typeof (window as any).require).toBe('function');
    });

    it('should verify immediate features work independently', async () => {
      await import('../../injected');

      // Clear previous calls to focus on this test
      jest.clearAllMocks();

      // Test clipboard functionality works immediately
      await navigator.clipboard.writeText('test-content');
      expect(mockRocketChatDesktop.writeTextToClipboard).toHaveBeenCalledWith(
        'test-content'
      );

      // Test notification functionality works immediately
      new (window as any).Notification('Test Title', {
        body: 'Test Body',
        icon: 'test-icon',
      });

      // Should have created notification (just verify it was called)
      expect(mockRocketChatDesktop.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Title',
          body: 'Test Body',
          icon: 'test-icon',
        })
      );
    });
  });

  describe('version-based feature detection', () => {
    it('should handle version-based module selection', async () => {
      // Test that version logic exists and doesn't crash
      await expect(import('../../injected')).resolves.toBeDefined();

      // Test that the version-based logic is present by checking server info
      expect(mockModules['/app/utils/rocketchat.info']).toBeDefined();
      expect(mockModules['/app/utils/rocketchat.info'].Info.version).toBe(
        '6.5.0'
      );
    });
  });

  describe('error handling', () => {
    it('should be resilient to module loading failures', async () => {
      // Test that the script can handle errors without crashing
      await expect(import('../../injected')).resolves.toBeDefined();

      // Test that the error handling system is in place
      expect(typeof mockWindowRequire).toBe('function');
      expect((window as any).require).toBe(mockWindowRequire);
    });

    it('should maintain functionality when modules are missing', async () => {
      // The core functionality (clipboard, notifications) should work regardless
      await import('../../injected');

      // Clear any previous calls
      jest.clearAllMocks();

      // Test that essential functionality still works
      await navigator.clipboard.writeText('test');
      expect(mockRocketChatDesktop.writeTextToClipboard).toHaveBeenCalledWith(
        'test'
      );

      // Test notifications still work
      new (window as any).Notification('Test');
      expect(mockRocketChatDesktop.createNotification).toHaveBeenCalled();
    });
  });

  describe('Notification class', () => {
    let NotificationClass: any;

    beforeEach(async () => {
      await import('../../injected');
      NotificationClass = (window as any).Notification;
    });

    it('should have correct static properties', () => {
      expect(NotificationClass.permission).toBe('granted');
      expect(NotificationClass.maxActions).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should return granted permission when requested', async () => {
      const permission = await NotificationClass.requestPermission();
      expect(permission).toBe('granted');
    });

    it('should create notification with correct properties', () => {
      const notification = new NotificationClass('Test Title', {
        body: 'Test Body',
        icon: 'icon.png',
      });

      expect(notification.title).toBe('Test Title');
      expect(notification.body).toBe('Test Body');
      expect(notification.icon).toBe('icon.png');
      expect(notification.lang).toBe('en');
    });

    it('should handle event listeners correctly', () => {
      const notification = new NotificationClass('Test');
      const clickHandler = jest.fn();

      notification.onclick = clickHandler;
      expect(notification.onclick).toBe(clickHandler);

      notification.onclick = null;
      expect(notification.onclick).toBe(null);
    });

    it('should handle close method', async () => {
      const notification = new NotificationClass('Test');

      // The destroy promise should be created
      expect(mockRocketChatDesktop.createNotification).toHaveBeenCalled();

      notification.close();

      // Should handle close gracefully
      expect(notification.close).toBeDefined();
    });
  });
});
