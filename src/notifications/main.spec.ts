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

  it('dispatches NOTIFICATIONS_NOTIFICATION_CLICKED for a click activation', async () => {
    await createTestNotification('click-abc123');

    handleNotificationActivation({
      type: 'click',
      arguments: 'type=click&tag=click-abc123',
    } as any);

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

  it('warns and does not dispatch when the tag cannot be parsed', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    handleNotificationActivation({
      type: 'reply',
      arguments: 'garbage',
      reply: 'hi',
    } as any);

    expect(mockDispatchSingle).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('warns and does not dispatch when routing metadata is missing', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    handleNotificationActivation({
      type: 'reply',
      arguments: 'type=reply&tag=unknown-id',
      reply: 'hi',
    } as any);

    expect(mockDispatchSingle).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('does not attach instance click/reply/action listeners on win32', async () => {
    await createTestNotification('listeners-abc123');

    const instance = notificationInstances[0];
    expect(instance.listeners.click).toBeUndefined();
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
