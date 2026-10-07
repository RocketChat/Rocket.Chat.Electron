import {
  NOTIFICATIONS_CREATE_REQUESTED,
  NOTIFICATIONS_CREATE_RESPONDED,
  NOTIFICATIONS_NOTIFICATION_ACTIONED,
  NOTIFICATIONS_NOTIFICATION_DISMISSED,
  NOTIFICATIONS_NOTIFICATION_REPLIED,
} from '../actions';

const originalPlatform = process.platform;

const dispatch = jest.fn();
const request = jest.fn();
const listeners = new Map<string, (action: any) => void>();

jest.mock('../../store', () => ({
  dispatch: (...args: unknown[]) => dispatch(...args),
  request: (...args: unknown[]) => request(...args),
  listen: (type: string, listener: (action: any) => void) => {
    listeners.set(type, listener);
    return () => listeners.delete(type);
  },
}));

jest.mock('../../servers/preload/urls', () => ({
  getServerUrl: jest.fn(() => 'https://open.rocket.chat'),
  getAbsoluteUrl: jest.fn((path: string) =>
    path.startsWith('http') ? path : `https://open.rocket.chat${path}`
  ),
}));

jest.mock('../../ui/actions', () => ({
  SIDE_BAR_DOWNLOADS_BUTTON_CLICKED: 'sidebar/downloads-button-clicked',
  WEBVIEW_FOCUS_REQUESTED: 'webview/focus-requested',
}));

const setPlatform = (platform: NodeJS.Platform): void => {
  Object.defineProperty(process, 'platform', {
    value: platform,
    writable: true,
    configurable: true,
  });
};

const loadPreload = async () => {
  jest.resetModules();
  listeners.clear();
  dispatch.mockClear();
  request.mockReset();
  request.mockImplementation(async () => `id-${request.mock.calls.length}`);
  return import('../preload');
};

describe('notifications/preload event handler lifetime', () => {
  afterAll(() => {
    setPlatform(originalPlatform);
  });

  afterEach(() => {
    setPlatform(originalPlatform);
  });

  it('keeps the reply handler after dismiss on win32 so a late Action Center reply still reaches onEvent', async () => {
    setPlatform('win32');
    const {
      createNotification,
      destroyNotification,
      listenToNotificationsRequests,
    } = await loadPreload();

    const onEvent = jest.fn();
    const id = await createNotification({
      title: 'Hello',
      body: 'World',
      onEvent,
    });

    listenToNotificationsRequests();
    destroyNotification(id);

    expect(dispatch).toHaveBeenCalledWith({
      type: NOTIFICATIONS_NOTIFICATION_DISMISSED,
      payload: { id },
    });

    const replied = listeners.get(NOTIFICATIONS_NOTIFICATION_REPLIED);
    expect(replied).toBeDefined();
    replied!({
      type: NOTIFICATIONS_NOTIFICATION_REPLIED,
      payload: { id, reply: 'late reply' },
    });

    expect(onEvent).toHaveBeenCalledWith({
      type: 'reply',
      detail: { reply: 'late reply' },
    });
  });

  it('frees the reply handler on dismiss when not on win32', async () => {
    setPlatform('linux');
    const {
      createNotification,
      destroyNotification,
      listenToNotificationsRequests,
    } = await loadPreload();

    const onEvent = jest.fn();
    const id = await createNotification({
      title: 'Hello',
      body: 'World',
      onEvent,
    });

    listenToNotificationsRequests();
    destroyNotification(id);

    const replied = listeners.get(NOTIFICATIONS_NOTIFICATION_REPLIED);
    replied!({
      type: NOTIFICATIONS_NOTIFICATION_REPLIED,
      payload: { id, reply: 'too late' },
    });

    expect(onEvent).not.toHaveBeenCalled();
  });

  it('releases the win32 handler after a reply (EOL) so a second reply is ignored', async () => {
    setPlatform('win32');
    const {
      createNotification,
      destroyNotification,
      listenToNotificationsRequests,
    } = await loadPreload();

    const onEvent = jest.fn();
    const id = await createNotification({
      title: 'Hello',
      body: 'World',
      onEvent,
    });

    listenToNotificationsRequests();
    destroyNotification(id);

    const replied = listeners.get(NOTIFICATIONS_NOTIFICATION_REPLIED)!;
    replied({
      type: NOTIFICATIONS_NOTIFICATION_REPLIED,
      payload: { id, reply: 'first' },
    });
    replied({
      type: NOTIFICATIONS_NOTIFICATION_REPLIED,
      payload: { id, reply: 'second' },
    });

    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledWith({
      type: 'reply',
      detail: { reply: 'first' },
    });
  });

  it('releases the win32 handler after an action (EOL)', async () => {
    setPlatform('win32');
    const {
      createNotification,
      destroyNotification,
      listenToNotificationsRequests,
    } = await loadPreload();

    const onEvent = jest.fn();
    const id = await createNotification({
      title: 'Hello',
      body: 'World',
      onEvent,
    });

    listenToNotificationsRequests();
    destroyNotification(id);

    const actioned = listeners.get(NOTIFICATIONS_NOTIFICATION_ACTIONED)!;
    actioned({
      type: NOTIFICATIONS_NOTIFICATION_ACTIONED,
      payload: { id, index: 0 },
    });

    expect(onEvent).toHaveBeenCalledWith({
      type: 'action',
      detail: { index: 0 },
    });

    const replied = listeners.get(NOTIFICATIONS_NOTIFICATION_REPLIED)!;
    replied({
      type: NOTIFICATIONS_NOTIFICATION_REPLIED,
      payload: { id, reply: 'after action' },
    });
    expect(onEvent).toHaveBeenCalledTimes(1);
  });

  it('evicts the oldest handler once the LRU cap is exceeded', async () => {
    setPlatform('win32');
    const { createNotification, listenToNotificationsRequests } =
      await loadPreload();

    const onEvents = Array.from({ length: 201 }, () => jest.fn());
    // Sequential inserts so Map iteration order matches creation order for the
    // LRU eviction assertion below.
    const ids: unknown[] = [];
    for (let i = 0; i < onEvents.length; i += 1) {
      ids.push(
        // eslint-disable-next-line no-await-in-loop -- order-sensitive LRU setup
        await createNotification({
          title: 'n',
          body: 'b',
          onEvent: onEvents[i],
        })
      );
    }

    listenToNotificationsRequests();

    const replied = listeners.get(NOTIFICATIONS_NOTIFICATION_REPLIED)!;
    replied({
      type: NOTIFICATIONS_NOTIFICATION_REPLIED,
      payload: { id: ids[0], reply: 'evicted' },
    });
    expect(onEvents[0]).not.toHaveBeenCalled();

    replied({
      type: NOTIFICATIONS_NOTIFICATION_REPLIED,
      payload: { id: ids[200], reply: 'kept' },
    });
    expect(onEvents[200]).toHaveBeenCalledWith({
      type: 'reply',
      detail: { reply: 'kept' },
    });
  });

  it('still creates notifications through the request channel', async () => {
    const { createNotification } = await loadPreload();

    await createNotification({ title: 't', body: 'b' });

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NOTIFICATIONS_CREATE_REQUESTED,
        payload: expect.objectContaining({ title: 't', body: 'b' }),
      }),
      NOTIFICATIONS_CREATE_RESPONDED
    );
  });
});
