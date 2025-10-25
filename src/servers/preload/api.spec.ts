/**
 * Unit tests for src/servers/preload/api.ts
 *
 * Tests the RocketChatDesktopAPI type definitions and implementation including:
 * - API structure and method signatures
 * - onReady callback mechanism
 * - setServerInfo behavior
 * - Integration with preload modules
 */

import {
  createNotification,
  destroyNotification,
} from '../../notifications/preload';
import {
  getOutlookEvents,
  setOutlookExchangeUrl,
  hasOutlookCredentials,
  clearOutlookCredentials,
  setUserToken,
} from '../../outlookCalendar/preload';
import { setUserPresenceDetection } from '../../userPresence/preload';
import type { Server } from '../common';
import { RocketChatDesktop, serverInfo } from './api';
import { setBadge } from './badge';
import { writeTextToClipboard } from './clipboard';
import { openDocumentViewer } from './documentViewer';
import { setFavicon } from './favicon';
import { setGitCommitHash } from './gitCommitHash';
import {
  getInternalVideoChatWindowEnabled,
  openInternalVideoChatWindow,
} from './internalVideoChatWindow';
import { reloadServer } from './reloadServer';
import {
  setBackground,
  setServerVersionToSidebar,
  setSidebarCustomTheme,
} from './sidebar';
import { setUserThemeAppearance } from './themeAppearance';
import { setTitle } from './title';
import { setUrlResolver } from './urls';
import { setUserLoggedIn } from './userLoggedIn';

// Mock all dependencies
jest.mock('../../notifications/preload', () => ({
  createNotification: jest.fn(),
  destroyNotification: jest.fn(),
}));

jest.mock('../../outlookCalendar/preload', () => ({
  getOutlookEvents: jest.fn(),
  setOutlookExchangeUrl: jest.fn(),
  hasOutlookCredentials: jest.fn(),
  clearOutlookCredentials: jest.fn(),
  setUserToken: jest.fn(),
}));

jest.mock('../../userPresence/preload', () => ({
  setUserPresenceDetection: jest.fn(),
}));

jest.mock('./badge', () => ({
  setBadge: jest.fn(),
}));

jest.mock('./clipboard', () => ({
  writeTextToClipboard: jest.fn(),
}));

jest.mock('./documentViewer', () => ({
  openDocumentViewer: jest.fn(),
}));

jest.mock('./favicon', () => ({
  setFavicon: jest.fn(),
}));

jest.mock('./gitCommitHash', () => ({
  setGitCommitHash: jest.fn(),
}));

jest.mock('./internalVideoChatWindow', () => ({
  getInternalVideoChatWindowEnabled: jest.fn(),
  openInternalVideoChatWindow: jest.fn(),
}));

jest.mock('./reloadServer', () => ({
  reloadServer: jest.fn(),
}));

jest.mock('./sidebar', () => ({
  setBackground: jest.fn(),
  setServerVersionToSidebar: jest.fn(),
  setSidebarCustomTheme: jest.fn(),
}));

jest.mock('./themeAppearance', () => ({
  setUserThemeAppearance: jest.fn(),
}));

jest.mock('./title', () => ({
  setTitle: jest.fn(),
}));

jest.mock('./urls', () => ({
  setUrlResolver: jest.fn(),
}));

jest.mock('./userLoggedIn', () => ({
  setUserLoggedIn: jest.fn(),
}));

describe('servers/preload/api.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('RocketChatDesktopAPI Type Definition', () => {
    it('should export RocketChatDesktop API object', () => {
      expect(RocketChatDesktop).toBeDefined();
      expect(typeof RocketChatDesktop).toBe('object');
    });

    it('should have all required API methods', () => {
      const expectedMethods = [
        'onReady',
        'setServerInfo',
        'setUrlResolver',
        'setBadge',
        'setFavicon',
        'setBackground',
        'setSidebarCustomTheme',
        'setTitle',
        'setUserLoggedIn',
        'setUserPresenceDetection',
        'setUserThemeAppearance',
        'createNotification',
        'destroyNotification',
        'getInternalVideoChatWindowEnabled',
        'openInternalVideoChatWindow',
        'setGitCommitHash',
        'writeTextToClipboard',
        'getOutlookEvents',
        'setOutlookExchangeUrl',
        'hasOutlookCredentials',
        'clearOutlookCredentials',
        'setUserToken',
        'openDocumentViewer',
        'reloadServer',
      ];

      expectedMethods.forEach((method) => {
        expect(RocketChatDesktop).toHaveProperty(method);
        expect(typeof (RocketChatDesktop as any)[method]).toBe('function');
      });
    });
  });

  describe('onReady callback mechanism', () => {
    it('should register callback for when server info is ready', () => {
      const mockCallback = jest.fn();

      RocketChatDesktop.onReady(mockCallback);

      // Callback is stored but not called yet if serverInfo not set
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should immediately call callback if serverInfo already exists', () => {
      const mockServerInfo = { version: '6.5.0' };
      const mockCallback = jest.fn();

      // First set server info
      RocketChatDesktop.setServerInfo(mockServerInfo);

      // Then register callback
      RocketChatDesktop.onReady(mockCallback);

      // Should be called immediately with existing serverInfo
      expect(mockCallback).toHaveBeenCalledWith(mockServerInfo);
    });

    it('should call callback when setServerInfo is invoked', () => {
      const mockCallback = jest.fn();
      const mockServerInfo = { version: '7.0.0' };

      RocketChatDesktop.onReady(mockCallback);
      RocketChatDesktop.setServerInfo(mockServerInfo);

      expect(mockCallback).toHaveBeenCalledWith(mockServerInfo);
    });

    it('should update callback when onReady is called multiple times', () => {
      const firstCallback = jest.fn();
      const secondCallback = jest.fn();
      const mockServerInfo = { version: '6.8.0' };

      RocketChatDesktop.onReady(firstCallback);
      RocketChatDesktop.onReady(secondCallback);

      RocketChatDesktop.setServerInfo(mockServerInfo);

      // Only the most recent callback should be active
      expect(secondCallback).toHaveBeenCalledWith(mockServerInfo);
    });
  });

  describe('setServerInfo', () => {
    it('should store server info', () => {
      const mockServerInfo = { version: '6.3.0' };

      RocketChatDesktop.setServerInfo(mockServerInfo);

      // Verify serverInfo module variable is updated
      expect(serverInfo).toBeDefined();
    });

    it('should call setServerVersionToSidebar with version', () => {
      const mockServerInfo = { version: '7.5.0' };

      RocketChatDesktop.setServerInfo(mockServerInfo);

      expect(setServerVersionToSidebar).toHaveBeenCalledWith('7.5.0');
    });

    it('should trigger onReady callback', () => {
      const mockCallback = jest.fn();
      const mockServerInfo = { version: '6.0.0' };

      RocketChatDesktop.onReady(mockCallback);
      RocketChatDesktop.setServerInfo(mockServerInfo);

      expect(mockCallback).toHaveBeenCalledWith(mockServerInfo);
    });

    it('should handle multiple setServerInfo calls', () => {
      const mockCallback = jest.fn();

      RocketChatDesktop.onReady(mockCallback);

      RocketChatDesktop.setServerInfo({ version: '6.0.0' });
      RocketChatDesktop.setServerInfo({ version: '6.1.0' });
      RocketChatDesktop.setServerInfo({ version: '6.2.0' });

      expect(mockCallback).toHaveBeenCalledTimes(3);
      expect(mockCallback).toHaveBeenLastCalledWith({ version: '6.2.0' });
    });
  });

  describe('Delegation to preload modules', () => {
    it('should delegate setUrlResolver to urls module', () => {
      const mockResolver = jest.fn(
        (path?: string) => `https://test.com${path || ''}`
      );

      RocketChatDesktop.setUrlResolver(mockResolver);

      expect(setUrlResolver).toHaveBeenCalledWith(mockResolver);
    });

    it('should delegate setBadge to badge module', () => {
      const mockBadge: Server['badge'] = { title: 'Test', count: 5 };

      RocketChatDesktop.setBadge(mockBadge);

      expect(setBadge).toHaveBeenCalledWith(mockBadge);
    });

    it('should delegate setFavicon to favicon module', () => {
      const faviconUrl = 'https://example.com/favicon.ico';

      RocketChatDesktop.setFavicon(faviconUrl);

      expect(setFavicon).toHaveBeenCalledWith(faviconUrl);
    });

    it('should delegate setBackground to sidebar module', () => {
      const imageUrl = 'https://example.com/background.jpg';

      RocketChatDesktop.setBackground(imageUrl);

      expect(setBackground).toHaveBeenCalledWith(imageUrl);
    });

    it('should delegate setTitle to title module', () => {
      const title = 'My Rocket.Chat Server';

      RocketChatDesktop.setTitle(title);

      expect(setTitle).toHaveBeenCalledWith(title);
    });

    it('should delegate setUserPresenceDetection to userPresence module', () => {
      const options = {
        isAutoAwayEnabled: true,
        idleThreshold: 300,
        setUserOnline: jest.fn(),
      };

      RocketChatDesktop.setUserPresenceDetection(options);

      expect(setUserPresenceDetection).toHaveBeenCalledWith(options);
    });

    it('should delegate setUserLoggedIn to userLoggedIn module', () => {
      RocketChatDesktop.setUserLoggedIn(true);

      expect(setUserLoggedIn).toHaveBeenCalledWith(true);
    });

    it('should delegate setUserThemeAppearance to themeAppearance module', () => {
      const theme: Server['themeAppearance'] = 'dark';

      RocketChatDesktop.setUserThemeAppearance(theme);

      expect(setUserThemeAppearance).toHaveBeenCalledWith(theme);
    });

    it('should delegate createNotification to notifications module', async () => {
      const options = {
        title: 'Test Notification',
        body: 'Test body',
        onEvent: jest.fn(),
      };

      await RocketChatDesktop.createNotification(options);

      expect(createNotification).toHaveBeenCalledWith(options);
    });

    it('should delegate destroyNotification to notifications module', () => {
      const notificationId = 'test-id-123';

      RocketChatDesktop.destroyNotification(notificationId);

      expect(destroyNotification).toHaveBeenCalledWith(notificationId);
    });

    it('should delegate getInternalVideoChatWindowEnabled to internalVideoChatWindow module', () => {
      RocketChatDesktop.getInternalVideoChatWindowEnabled();

      expect(getInternalVideoChatWindowEnabled).toHaveBeenCalled();
    });

    it('should delegate openInternalVideoChatWindow to internalVideoChatWindow module', () => {
      const url = 'https://meet.jit.si/test-room';
      const options = { width: 800, height: 600 };

      RocketChatDesktop.openInternalVideoChatWindow(url, options);

      expect(openInternalVideoChatWindow).toHaveBeenCalledWith(url, options);
    });

    it('should delegate setGitCommitHash to gitCommitHash module', () => {
      const hash = 'abc123def456';

      RocketChatDesktop.setGitCommitHash(hash);

      expect(setGitCommitHash).toHaveBeenCalledWith(hash);
    });

    it('should delegate writeTextToClipboard to clipboard module', () => {
      const text = 'Copy this text';

      RocketChatDesktop.writeTextToClipboard(text);

      expect(writeTextToClipboard).toHaveBeenCalledWith(text);
    });

    it('should delegate getOutlookEvents to outlookCalendar module', async () => {
      const date = new Date('2025-10-08');

      await RocketChatDesktop.getOutlookEvents(date);

      expect(getOutlookEvents).toHaveBeenCalledWith(date);
    });

    it('should delegate setOutlookExchangeUrl to outlookCalendar module', () => {
      const url = 'https://exchange.company.com';
      const userId = 'user-123';

      RocketChatDesktop.setOutlookExchangeUrl(url, userId);

      expect(setOutlookExchangeUrl).toHaveBeenCalledWith(url, userId);
    });

    it('should delegate hasOutlookCredentials to outlookCalendar module', async () => {
      await RocketChatDesktop.hasOutlookCredentials();

      expect(hasOutlookCredentials).toHaveBeenCalled();
    });

    it('should delegate clearOutlookCredentials to outlookCalendar module', () => {
      RocketChatDesktop.clearOutlookCredentials();

      expect(clearOutlookCredentials).toHaveBeenCalled();
    });

    it('should delegate setUserToken to outlookCalendar module', () => {
      const token = 'auth-token-xyz';
      const userId = 'user-456';

      RocketChatDesktop.setUserToken(token, userId);

      expect(setUserToken).toHaveBeenCalledWith(token, userId);
    });

    it('should delegate setSidebarCustomTheme to sidebar module', () => {
      const customTheme = '{ "primary": "#FF0000" }';

      RocketChatDesktop.setSidebarCustomTheme(customTheme);

      expect(setSidebarCustomTheme).toHaveBeenCalledWith(customTheme);
    });

    it('should delegate openDocumentViewer to documentViewer module', () => {
      const url = 'https://example.com/document.pdf';
      const format = 'pdf';
      const options = { title: 'My Document' };

      RocketChatDesktop.openDocumentViewer(url, format, options);

      expect(openDocumentViewer).toHaveBeenCalledWith(url, format, options);
    });

    it('should delegate reloadServer to reloadServer module', () => {
      RocketChatDesktop.reloadServer();

      expect(reloadServer).toHaveBeenCalled();
    });
  });

  describe('Type safety and structure', () => {
    it('should accept valid badge object', () => {
      const validBadge: Server['badge'] = {
        title: 'Unread',
        count: 10,
      };

      expect(() => RocketChatDesktop.setBadge(validBadge)).not.toThrow();
    });

    it('should accept valid theme appearance values', () => {
      const validThemes: Array<Server['themeAppearance']> = [
        'auto',
        'dark',
        'light',
        'high-contrast',
      ];

      validThemes.forEach((theme) => {
        expect(() =>
          RocketChatDesktop.setUserThemeAppearance(theme)
        ).not.toThrow();
      });
    });

    it('should accept notification options with canReply', async () => {
      const options = {
        title: 'Reply Test',
        body: 'Can you reply?',
        canReply: true,
        onEvent: jest.fn(),
      };

      await expect(
        RocketChatDesktop.createNotification(options)
      ).resolves.not.toThrow();
    });

    it('should accept user presence detection options', () => {
      const options = {
        isAutoAwayEnabled: true,
        idleThreshold: 600,
        setUserOnline: jest.fn((online: boolean) => {
          expect(typeof online).toBe('boolean');
        }),
      };

      expect(() =>
        RocketChatDesktop.setUserPresenceDetection(options)
      ).not.toThrow();
    });

    it('should handle null idleThreshold in presence detection', () => {
      const options = {
        isAutoAwayEnabled: false,
        idleThreshold: null,
        setUserOnline: jest.fn(),
      };

      expect(() =>
        RocketChatDesktop.setUserPresenceDetection(options)
      ).not.toThrow();
    });
  });

  describe('Integration scenarios', () => {
    it('should support complete initialization flow', () => {
      const mockCallback = jest.fn();
      const mockServerInfo = { version: '6.5.0' };

      // 1. Register callback
      RocketChatDesktop.onReady(mockCallback);

      // 2. Set server info
      RocketChatDesktop.setServerInfo(mockServerInfo);

      // 3. Setup other features
      RocketChatDesktop.setUrlResolver(
        (path) => `https://test.com${path || ''}`
      );
      RocketChatDesktop.setBadge({ title: 'Test', count: 0 });
      RocketChatDesktop.setUserLoggedIn(true);

      expect(mockCallback).toHaveBeenCalledWith(mockServerInfo);
      expect(setUrlResolver).toHaveBeenCalled();
      expect(setBadge).toHaveBeenCalled();
      expect(setUserLoggedIn).toHaveBeenCalled();
    });

    it('should support Outlook calendar integration flow', async () => {
      const url = 'https://exchange.example.com';
      const userId = 'user-789';
      const token = 'token-abc';
      const date = new Date();

      // Setup Outlook integration
      RocketChatDesktop.setOutlookExchangeUrl(url, userId);
      RocketChatDesktop.setUserToken(token, userId);

      // Check credentials
      await RocketChatDesktop.hasOutlookCredentials();

      // Get events
      await RocketChatDesktop.getOutlookEvents(date);

      // Clear credentials
      RocketChatDesktop.clearOutlookCredentials();

      expect(setOutlookExchangeUrl).toHaveBeenCalledWith(url, userId);
      expect(setUserToken).toHaveBeenCalledWith(token, userId);
      expect(hasOutlookCredentials).toHaveBeenCalled();
      expect(getOutlookEvents).toHaveBeenCalledWith(date);
      expect(clearOutlookCredentials).toHaveBeenCalled();
    });

    it('should support notification lifecycle', async () => {
      const notificationId = 'notification-xyz';
      (createNotification as jest.Mock).mockResolvedValue(notificationId);

      // Create notification
      const id = await RocketChatDesktop.createNotification({
        title: 'Test',
        body: 'Message',
        onEvent: jest.fn(),
      });

      // Destroy notification
      RocketChatDesktop.destroyNotification(id);

      expect(createNotification).toHaveBeenCalled();
      expect(destroyNotification).toHaveBeenCalledWith(notificationId);
    });
  });
});