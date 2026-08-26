import { Notification } from 'electron';

import {
  NOTIFICATIONS_NOTIFICATION_ACTIONED,
  NOTIFICATIONS_NOTIFICATION_CLICKED,
  NOTIFICATIONS_NOTIFICATION_REPLIED,
} from './actions';
import { handleNotificationActivation, setupNotifications } from './main';

const originalPlatform = process.platform;

let notificationInstances: any[] = [];

jest.mock('electron', () => {
  class MockNotification {
    static handleActivation = jest.fn();

    options: any;

    listeners: Record<string, ((...args: any[]) => void)[]> = {};

    constructor(options: any) {
      this.options = options;
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      notificationInstances.push(this);
    }

    addListener(event: string, handler: (...args: any[]) => void): void {
      this.listeners[event] = this.listeners[event] || [];
      this.listeners[event].push(handler);
    }

    show = jest.fn();

    close = jest.fn();
  }

  return {
    Notification: MockNotification,
    nativeImage: { createFromDataURL: jest.fn() },
  };
});

jest.mock('../ipc/main', () => ({
  invoke: jest.fn(),
}));

jest.mock('../ui/main/rootWindow', () => ({
  getRootWindow: jest.fn(),
}));

jest.mock('../ui/main/serverView', () => ({
  getServerUrlByWebContentsId: jest.fn(() => 'https://example.com'),
}));

jest.mock('./attentionDrawing', () => ({
  __esModule: true,
  default: { drawAttention: jest.fn(), stopAttention: jest.fn() },
}));

const mockNotificationsWarn = jest.fn();

jest.mock('../logging/scopes', () => ({
  loggers: {
    notifications: { warn: (...args: any[]) => mockNotificationsWarn(...args) },
  },
}));

const listeners = new Map<string, (action: any) => void | Promise<void>>();

const mockDispatch = jest.fn();
const mockDispatchSingle = jest.fn();
const mockSelect = jest.fn((_selector?: any) => true);

jest.mock('../store', () => ({
  dispatch: (action: any) => mockDispatch(action),
  dispatchSingle: (action: any) => mockDispatchSingle(action),
  select: (selector: any) => mockSelect(selector),
  listen: (type: string, listener: (action: any) => void) => {
    listeners.set(type, listener);
    return () => listeners.delete(type);
  },
}));

describe('notifications/main win32 activation routing', () => {
  beforeAll(() => {
    Object.defineProperty(process, 'platform', {
      value: 'win32',
      writable: true,
      configurable: true,
    });
  });

  afterAll(() => {
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      writable: true,
      configurable: true,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    listeners.clear();
    notificationInstances = [];
    mockSelect.mockReturnValue(true);
    setupNotifications();
  });

  const createTestNotification = async (
    id: string,
    ipcMeta: any = { type: 'single', webContentsId: 7 }
  ): Promise<void> => {
    const createRequested = listeners.get('notifications/create-requested');
    expect(createRequested).toBeDefined();
    await createRequested!({
      type: 'notifications/create-requested',
      payload: { title: 'Hello', tag: id, canReply: true },
      meta: { id: 'req-1' },
      ipcMeta,
    });
  };

  it('registers Notification.handleActivation on win32', () => {
    expect(Notification.handleActivation).toHaveBeenCalledWith(
      handleNotificationActivation
    );
  });

  it('dispatches NOTIFICATIONS_NOTIFICATION_REPLIED for a reply activation', async () => {
    await createTestNotification('reply-abc123');

    handleNotificationActivation({
      type: 'reply',
      arguments: 'type=reply&tag=reply-abc123',
      reply: 'hello there',
    } as any);

    expect(mockDispatchSingle).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NOTIFICATIONS_NOTIFICATION_REPLIED,
        payload: { id: 'reply-abc123', reply: 'hello there' },
      })
    );
  });

  it('dispatches NOTIFICATIONS_NOTIFICATION_ACTIONED for an action activation', async () => {
    await createTestNotification('action-abc123');

    handleNotificationActivation({
      type: 'action',
      arguments: 'type=action&tag=action-abc123',
      actionIndex: 2,
    } as any);

    expect(mockDispatchSingle).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NOTIFICATIONS_NOTIFICATION_ACTIONED,
        payload: { id: 'action-abc123', index: 2 },
      })
    );
  });

  it('attaches the instance click listener on win32 with handleActivation available, and firing it dispatches NOTIFICATIONS_NOTIFICATION_CLICKED', async () => {
    await createTestNotification('click-abc123');

    const instance = notificationInstances[0];
    expect(instance.listeners.click).toBeDefined();

    instance.listeners.click[0]();

    expect(mockDispatchSingle).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NOTIFICATIONS_NOTIFICATION_CLICKED,
        payload: expect.objectContaining({
          id: 'click-abc123',
          serverUrl: 'https://example.com',
        }),
      })
    );
  });

  it('preserves the category for a root click on a card retained past close', async () => {
    const createRequested = listeners.get('notifications/create-requested');
    expect(createRequested).toBeDefined();
    await createRequested!({
      type: 'notifications/create-requested',
      payload: {
        title: 'Hello',
        tag: 'category-abc123',
        canReply: true,
        category: 'DOWNLOADS',
      },
      meta: { id: 'req-1' },
      ipcMeta: { type: 'single', webContentsId: 7 },
    });

    const instance = notificationInstances[0];

    // Windows auto-hides the banner into the Action Center: Electron emits
    // `close`, which drops `notificationCategories`, before the root card is
    // clicked.
    instance.listeners.close[0]();

    mockDispatchSingle.mockClear();

    instance.listeners.click[0]();

    expect(mockDispatchSingle).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NOTIFICATIONS_NOTIFICATION_CLICKED,
        payload: expect.objectContaining({
          id: 'category-abc123',
          category: 'DOWNLOADS',
        }),
      })
    );
  });

  it('warns and does not dispatch when the tag cannot be parsed', () => {
    handleNotificationActivation({
      type: 'reply',
      arguments: 'garbage',
      reply: 'hi',
    } as any);

    expect(mockDispatchSingle).not.toHaveBeenCalled();
    expect(mockNotificationsWarn).toHaveBeenCalled();
  });

  it('warns but still broadcasts the reply when routing metadata is missing', () => {
    handleNotificationActivation({
      type: 'reply',
      arguments: 'type=reply&tag=unknown-id',
      reply: 'hi',
    } as any);

    expect(mockDispatchSingle).not.toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith({
      type: NOTIFICATIONS_NOTIFICATION_REPLIED,
      payload: { id: 'unknown-id', reply: 'hi' },
    });
    expect(mockNotificationsWarn).toHaveBeenCalled();
  });

  it('warns but still broadcasts the action when routing metadata is missing', () => {
    handleNotificationActivation({
      type: 'action',
      arguments: 'type=action&tag=unknown-id',
      actionIndex: 1,
    } as any);

    expect(mockDispatchSingle).not.toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith({
      type: NOTIFICATIONS_NOTIFICATION_ACTIONED,
      payload: { id: 'unknown-id', index: 1 },
    });
    expect(mockNotificationsWarn).toHaveBeenCalled();
  });

  it('still delivers a reply from an Action Center card after the banner timed out and the web client auto-closed it', async () => {
    await createTestNotification('timeout-abc123');
    const instance = notificationInstances[0];

    // Windows auto-hides the banner into the Action Center: Electron emits
    // `close` while the card stays actionable.
    instance.listeners.close[0]();

    // The web client's `setTimeout(() => n.close())` then dismisses it.
    const dismissed = listeners.get('notifications/notification-dismissed');
    expect(dismissed).toBeDefined();
    dismissed!({
      type: 'notifications/notification-dismissed',
      payload: { id: 'timeout-abc123' },
    });

    // The dismissal must reach the instance even though `close` already
    // removed it from the live map, or the card is never taken down.
    expect(instance.close).toHaveBeenCalled();

    mockDispatch.mockClear();
    mockDispatchSingle.mockClear();

    handleNotificationActivation({
      type: 'reply',
      arguments: 'type=reply&tag=timeout-abc123',
      reply: 'late reply',
    } as any);

    // The reply lands, and win32 keeps the routing metadata through the
    // dismissal so it is still addressed to the originating view.
    expect(mockDispatchSingle).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NOTIFICATIONS_NOTIFICATION_REPLIED,
        payload: { id: 'timeout-abc123', reply: 'late reply' },
        ipcMeta: { type: 'single', webContentsId: 7 },
      })
    );
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('retains routing metadata through a dismissal on win32 so a later activation keeps its original ipcMeta', async () => {
    await createTestNotification('retain-abc123', {
      type: 'single',
      webContentsId: 42,
    });

    const dismissed = listeners.get('notifications/notification-dismissed');
    expect(dismissed).toBeDefined();
    dismissed!({
      type: 'notifications/notification-dismissed',
      payload: { id: 'retain-abc123' },
    });

    mockDispatch.mockClear();
    mockDispatchSingle.mockClear();

    handleNotificationActivation({
      type: 'reply',
      arguments: 'type=reply&tag=retain-abc123',
      reply: 'after dismissal',
    } as any);

    expect(mockDispatchSingle).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NOTIFICATIONS_NOTIFICATION_REPLIED,
        payload: { id: 'retain-abc123', reply: 'after dismissal' },
        ipcMeta: { type: 'single', webContentsId: 42 },
      })
    );
    // Precise routing survived, so the broadcast fallback stays untouched.
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockNotificationsWarn).not.toHaveBeenCalled();
  });

  it('keeps routing metadata across a banner timeout so the reply is still addressed to its view', async () => {
    await createTestNotification('closed-abc123');
    const instance = notificationInstances[0];

    instance.listeners.close[0]();

    mockDispatch.mockClear();
    mockDispatchSingle.mockClear();

    handleNotificationActivation({
      type: 'reply',
      arguments: 'type=reply&tag=closed-abc123',
      reply: 'from action center',
    } as any);

    expect(mockDispatchSingle).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NOTIFICATIONS_NOTIFICATION_REPLIED,
        payload: { id: 'closed-abc123', reply: 'from action center' },
        ipcMeta: { type: 'single', webContentsId: 7 },
      })
    );
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('attaches the instance click listener but not reply/action listeners on win32', async () => {
    await createTestNotification('listeners-abc123');

    const instance = notificationInstances[0];
    expect(instance.listeners.click).toBeDefined();
    expect(instance.listeners.reply).toBeUndefined();
    expect(instance.listeners.action).toBeUndefined();
    expect(instance.listeners.show).toBeDefined();
    expect(instance.listeners.close).toBeDefined();
  });

  it('falls back to instance click/reply/action listeners on win32 when handleActivation is unavailable', async () => {
    const originalHandleActivation = Notification.handleActivation;
    // @ts-expect-error simulating an older Electron without handleActivation
    Notification.handleActivation = undefined;

    // Re-register with handleActivation unavailable so setupNotifications
    // takes the fallback branch too.
    setupNotifications();

    await createTestNotification('fallback-abc123');

    const instance = notificationInstances[0];
    expect(instance.listeners.click).toBeDefined();
    expect(instance.listeners.reply).toBeDefined();
    expect(instance.listeners.action).toBeDefined();

    Notification.handleActivation = originalHandleActivation;
  });
});
