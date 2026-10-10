import {
  NOTIFICATIONS_CREATE_REQUESTED,
  NOTIFICATIONS_CREATE_RESPONDED,
  NOTIFICATIONS_NOTIFICATION_ACTIONED,
  NOTIFICATIONS_NOTIFICATION_CLICKED,
  NOTIFICATIONS_NOTIFICATION_CLOSED,
  NOTIFICATIONS_NOTIFICATION_DISMISSED,
  NOTIFICATIONS_NOTIFICATION_REPLIED,
  NOTIFICATIONS_NOTIFICATION_SHOWN,
} from '../actions';
import { setupNotifications } from '../main';

const listeners = new Map<string, (...args: any[]) => unknown>();
const dispatch = jest.fn();
const dispatchSingle = jest.fn();
const getRootWindow = jest.fn();
const getServerUrlByWebContentsId = jest.fn();
const invoke = jest.fn();
const drawAttention = jest.fn();
const stopAttention = jest.fn();
const notificationInstances: any[] = [];

jest.mock('electron', () => {
  class MockNotification {
    title = '';

    body = '';

    silent = false;

    icon: unknown;

    requireInteraction = false;

    listeners: Record<string, ((...args: any[]) => unknown)[]> = {};

    constructor(opts: any) {
      Object.assign(this, opts);
      notificationInstances.push(this);
    }

    addListener(event: string, cb: (...args: any[]) => unknown) {
      this.listeners[event] = this.listeners[event] || [];
      this.listeners[event].push(cb);
    }

    show = jest.fn();

    close = jest.fn();

    emit(event: string, ...args: unknown[]) {
      for (const cb of this.listeners[event] || []) {
        cb(...args);
      }
    }
  }

  return {
    Notification: MockNotification,
    nativeImage: {
      createFromDataURL: jest.fn(() => ({ isEmpty: () => false })),
      createEmpty: jest.fn(() => ({ isEmpty: () => true })),
    },
  };
});

jest.mock('../../store', () => ({
  dispatch: (...args: unknown[]) => dispatch(...args),
  dispatchSingle: (...args: unknown[]) => dispatchSingle(...args),
  select: () => true,
  listen: (type: string, listener: (...args: any[]) => unknown) => {
    listeners.set(type, listener);
    return () => listeners.delete(type);
  },
}));

jest.mock('../../store/fsa', () => ({
  hasMeta: (action: any) => Boolean(action?.meta?.id),
}));

jest.mock('../../ipc/main', () => ({
  invoke: (...args: unknown[]) => invoke(...args),
}));

jest.mock('../../ui/main/rootWindow', () => ({
  getRootWindow: (...args: unknown[]) => getRootWindow(...args),
}));

jest.mock('../../ui/main/serverView', () => ({
  getServerUrlByWebContentsId: (...args: unknown[]) =>
    getServerUrlByWebContentsId(...args),
}));

jest.mock('../attentionDrawing', () => ({
  __esModule: true,
  default: {
    drawAttention: (...args: unknown[]) => drawAttention(...args),
    stopAttention: (...args: unknown[]) => stopAttention(...args),
  },
}));

describe('notifications/main setupNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listeners.clear();
    notificationInstances.length = 0;
    getRootWindow.mockResolvedValue({
      webContents: { id: 1 },
    });
    invoke.mockResolvedValue('data:image/png;base64,abc');
    getServerUrlByWebContentsId.mockReturnValue('https://open.rocket.chat');
    setupNotifications();
  });

  const create = async (payload: Record<string, unknown>, metaId = 'req-1') => {
    const listener = listeners.get(NOTIFICATIONS_CREATE_REQUESTED);
    await listener?.({
      type: NOTIFICATIONS_CREATE_REQUESTED,
      payload,
      ipcMeta: { webContentsId: 9 },
      meta: { id: metaId, response: false },
    });
  };

  const repliedCalls = () =>
    dispatchSingle.mock.calls.filter(
      ([action]) => action.type === NOTIFICATIONS_NOTIFICATION_REPLIED
    );

  it('creates a notification and wires show/click/close/reply/action', async () => {
    await create({
      title: 'Hello',
      body: 'World',
      canReply: true,
      actions: [{ title: 'Open' }],
      category: 'SERVER',
      notificationType: 'text',
      tag: 'n1',
    });

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NOTIFICATIONS_CREATE_RESPONDED,
        payload: 'n1',
      })
    );
    expect(notificationInstances).toHaveLength(1);
    const n = notificationInstances[0];
    expect(n.show).toHaveBeenCalled();

    n.emit('show');
    expect(dispatchSingle).toHaveBeenCalledWith(
      expect.objectContaining({ type: NOTIFICATIONS_NOTIFICATION_SHOWN })
    );

    n.emit('click');
    expect(dispatchSingle).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NOTIFICATIONS_NOTIFICATION_CLICKED,
        payload: expect.objectContaining({
          title: 'Hello',
          serverUrl: 'https://open.rocket.chat',
          category: 'SERVER',
        }),
      })
    );

    n.emit('reply', {}, 'thanks');
    expect(dispatchSingle).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NOTIFICATIONS_NOTIFICATION_REPLIED,
        payload: expect.objectContaining({ reply: 'thanks' }),
      })
    );

    n.emit('action', {}, 0);
    expect(dispatchSingle).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NOTIFICATIONS_NOTIFICATION_ACTIONED,
        payload: expect.objectContaining({ index: 0 }),
      })
    );

    n.emit('close');
    expect(dispatchSingle).toHaveBeenCalledWith(
      expect.objectContaining({ type: NOTIFICATIONS_NOTIFICATION_CLOSED })
    );
  });

  it('dispatches a duplicated reply event exactly once', async () => {
    await create({ title: 'Hello', tag: 'reply-once' });

    const notification = notificationInstances[0];
    notification.emit('reply', {}, 'hi there');
    notification.emit('reply', {}, 'hi there');

    expect(repliedCalls()).toHaveLength(1);
    expect(repliedCalls()[0][0].payload).toEqual({
      id: 'reply-once',
      reply: 'hi there',
    });
  });

  it('accepts another reply after the notification is shown again', async () => {
    await create({ title: 'Hello', tag: 'reply-again' });

    const notification = notificationInstances[0];
    notification.emit('reply', {}, 'first reply');
    notification.emit('show');
    notification.emit('reply', {}, 'second reply');

    expect(repliedCalls()).toHaveLength(2);
    expect(repliedCalls()[1][0].payload).toEqual({
      id: 'reply-again',
      reply: 'second reply',
    });
  });

  it('draws attention for voice notifications', async () => {
    await create({
      title: 'Call',
      body: 'Incoming',
      notificationType: 'voice',
      tag: 'voice-1',
    });
    notificationInstances[0].emit('show');
    expect(drawAttention).toHaveBeenCalledWith('voice-1');
    notificationInstances[0].emit('close');
    expect(stopAttention).toHaveBeenCalledWith('voice-1');
  });

  it('restores a minimized window when requested before toast display', async () => {
    const window = {
      isDestroyed: () => false,
      isMinimized: () => true,
      restore: jest.fn(),
      show: jest.fn(),
      focus: jest.fn(),
    };
    getRootWindow.mockResolvedValue(window);
    const notification = {
      title: 'Call',
      tag: 'call',
      notificationType: 'voice',
      restoreWindow: true,
    };
    await create(notification);
    await create(notification);
    expect(window.restore).toHaveBeenCalledTimes(2);
    expect(window.show).toHaveBeenCalledTimes(2);
    expect(window.focus).toHaveBeenCalledTimes(2);

    window.isMinimized = () => false;
    await create(notification);
    expect(window.restore).toHaveBeenCalledTimes(2);

    window.isMinimized = () => true;
    window.isDestroyed = () => true;
    await create(notification);
    expect(window.restore).toHaveBeenCalledTimes(2);
  });

  it('does not restore when restoreWindow is not requested', async () => {
    await create({
      title: 'Call',
      tag: 'call',
      notificationType: 'voice',
    });
    expect(getRootWindow).not.toHaveBeenCalled();
    await create({
      title: 'Message',
      tag: 'message',
      notificationType: 'text',
    });
    expect(getRootWindow).not.toHaveBeenCalled();
  });

  it('restores a real minimized Electron window when requested', async () => {
    const { BrowserWindow, app } = jest.requireActual('electron');
    await app.whenReady();
    const window = new BrowserWindow({ width: 400, height: 200, show: false });
    try {
      await window.loadURL('data:text/html,<title>Restore test</title>');
      window.show();
      const minimized = new Promise<void>((resolve) =>
        window.once('minimize', resolve)
      );
      window.minimize();
      await minimized;
      expect(window.isMinimized()).toBe(true);
      getRootWindow.mockResolvedValue(window);
      const restored = new Promise<void>((resolve) =>
        window.once('restore', resolve)
      );
      await create({
        title: 'Call',
        tag: 'call',
        notificationType: 'voice',
        restoreWindow: true,
      });
      await restored;
      expect(window.isMinimized()).toBe(false);
      expect(window.isVisible()).toBe(true);
    } finally {
      window.destroy();
    }
  });

  it('updates an existing tagged notification', async () => {
    await create({
      title: 'First',
      body: 'A',
      tag: 'same',
      notificationType: 'text',
    });
    await create({
      title: 'Second',
      body: 'B',
      tag: 'same',
      silent: true,
      notificationType: 'voice',
    });
    expect(notificationInstances).toHaveLength(1);
    expect(notificationInstances[0].title).toBe('Second');
    expect(notificationInstances[0].body).toBe('B');
    expect(drawAttention).toHaveBeenCalledWith('same');
  });

  it('dismisses a notification via action listener', async () => {
    await create({ title: 'X', body: 'Y', tag: 'dismiss-me' });
    const dismiss = listeners.get(NOTIFICATIONS_NOTIFICATION_DISMISSED);
    dismiss?.({
      type: NOTIFICATIONS_NOTIFICATION_DISMISSED,
      payload: { id: 'dismiss-me' },
    });
    expect(notificationInstances[0].close).toHaveBeenCalled();
  });

  it('ignores create requests without meta', async () => {
    const listener = listeners.get(NOTIFICATIONS_CREATE_REQUESTED);
    await listener?.({
      type: NOTIFICATIONS_CREATE_REQUESTED,
      payload: { title: 'No meta', body: 'x' },
    });
    expect(dispatch).not.toHaveBeenCalled();
    expect(notificationInstances).toHaveLength(0);
  });
});
