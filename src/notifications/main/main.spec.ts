/**
 * Regression tests for the reply-dedup guard in `src/notifications/main.ts`
 * (Electron 42 on Windows can dispatch a single toast reply twice).
 *
 * Location note: jest.config.js routes MAIN-process tests via
 *   '<rootDir>/src/*\/main/**\/*.(spec|test)...'  and
 *   '<rootDir>/src/**\/main.(spec|test)...'
 * A flat `src/notifications/main.spec.ts` would collide with the source file
 * `main.ts` and does not match either main-process pattern, so this spec
 * lives in a sibling `main/` directory to match the first pattern.
 *
 * `createNotification` is not exported, so the flow is driven through the
 * real public entry point: `setupNotifications()` registers a `listen()`
 * callback for `NOTIFICATIONS_CREATE_REQUESTED`; invoking that callback goes
 * through the same `handleCreateEvent` -> `createNotification` path used in
 * production.
 */

const listenRegistry = new Map<string, (action: any) => any>();
const dispatch = jest.fn();
const dispatchSingle = jest.fn();
jest.mock('../../store', () => ({
  dispatch: (...a: any[]) => dispatch(...a),
  dispatchSingle: (...a: any[]) => dispatchSingle(...a),
  listen: jest.fn((type: string, cb: (action: any) => any) => {
    listenRegistry.set(type, cb);
    return () => listenRegistry.delete(type);
  }),
}));

jest.mock('../../store/fsa', () => ({
  hasMeta: jest.fn(() => true),
}));

jest.mock('../../ipc/main', () => ({
  invoke: jest.fn(),
}));

jest.mock('../../ui/main/rootWindow', () => ({
  getRootWindow: jest.fn(),
}));

jest.mock('../../ui/main/serverView', () => ({
  getServerUrlByWebContentsId: jest.fn(),
}));

jest.mock('../attentionDrawing', () => ({
  __esModule: true,
  default: {
    drawAttention: jest.fn(),
    stopAttention: jest.fn(),
  },
}));

type Listener = (...args: any[]) => void;

class FakeNotification {
  static instances: FakeNotification[] = [];

  listeners: Record<string, Listener[]> = {};

  constructor(public options: any) {
    FakeNotification.instances.push(this);
  }

  addListener(event: string, fn: Listener) {
    (this.listeners[event] ??= []).push(fn);
  }

  show = jest.fn();

  fire(event: string, ...args: any[]) {
    (this.listeners[event] ?? []).forEach((fn) => fn(...args));
  }
}

jest.mock('electron', () => ({
  Notification: jest
    .fn()
    .mockImplementation((options: any) => new FakeNotification(options)),
  nativeImage: { createFromDataURL: jest.fn() },
}));

describe('notifications/main — reply dedup guard', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    listenRegistry.clear();
    FakeNotification.instances.length = 0;
  });

  const create = async (tag = 'notif-1') => {
    const { setupNotifications } = (await import('../main')) as any;
    setupNotifications();
    const createRequestedHandler = listenRegistry.get(
      'notifications/create-requested'
    );
    if (!createRequestedHandler) {
      throw new Error('create-requested listener not registered');
    }
    await createRequestedHandler({
      type: 'notifications/create-requested',
      payload: { tag, title: 'Hello' },
      meta: { id: 'req-1' },
    });
    return FakeNotification.instances[FakeNotification.instances.length - 1];
  };

  const repliedCalls = () =>
    dispatchSingle.mock.calls.filter(
      ([action]) => action.type === 'notifications/notification-replied'
    );

  it('dispatches REPLIED exactly once when the same reply event fires twice', async () => {
    const notification = await create();

    notification.fire('reply', {}, 'hi there');
    notification.fire('reply', {}, 'hi there');

    expect(repliedCalls()).toHaveLength(1);
    expect(repliedCalls()[0][0].payload).toEqual({
      id: 'notif-1',
      reply: 'hi there',
    });
  });

  it('re-arms the guard after another show event, allowing a subsequent reply to dispatch', async () => {
    const notification = await create();

    notification.fire('reply', {}, 'first reply');
    notification.fire('show');
    notification.fire('reply', {}, 'second reply');

    expect(repliedCalls()).toHaveLength(2);
    expect(repliedCalls()[1][0].payload).toEqual({
      id: 'notif-1',
      reply: 'second reply',
    });
  });
});
