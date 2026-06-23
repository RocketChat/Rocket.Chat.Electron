type IpcListener = (event: unknown, path: string) => void;

const ipcListeners = new Map<string, IpcListener>();
const on = jest.fn((channel: string, listener: IpcListener) => {
  ipcListeners.set(channel, listener);
});

jest.mock('electron', () => ({
  ipcRenderer: {
    on: (channel: string, listener: IpcListener) => on(channel, listener),
  },
}));

const emit = (path: string) => {
  const listener = ipcListeners.get('navigate-to-route');
  if (!listener) throw new Error('navigate-to-route listener not registered');
  listener({}, path);
};

describe('servers/preload/navigateToRoute', () => {
  let onNavigateToRoute: (cb: (path: string) => void) => void;
  let listenToNavigateToRouteRequests: () => void;

  beforeEach(async () => {
    jest.resetModules();
    ipcListeners.clear();
    on.mockClear();
    const mod = await import('./navigateToRoute');
    onNavigateToRoute = mod.onNavigateToRoute;
    listenToNavigateToRouteRequests = mod.listenToNavigateToRouteRequests;
  });

  it('registers the ipcRenderer listener only once', () => {
    listenToNavigateToRouteRequests();
    listenToNavigateToRouteRequests();
    expect(on).toHaveBeenCalledTimes(1);
    expect(on).toHaveBeenCalledWith('navigate-to-route', expect.any(Function));
  });

  it('delivers the path to a callback registered before the event', () => {
    listenToNavigateToRouteRequests();
    const cb = jest.fn();
    onNavigateToRoute(cb);

    emit('/channel/general');

    expect(cb).toHaveBeenCalledWith('/channel/general');
  });

  it('buffers a path that arrives before the callback registers, then flushes once', () => {
    listenToNavigateToRouteRequests();

    emit('/admin/rooms');

    const cb = jest.fn();
    onNavigateToRoute(cb);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith('/admin/rooms');

    // The buffered path is consumed: a later registration gets nothing extra.
    const cb2 = jest.fn();
    onNavigateToRoute(cb2);
    expect(cb2).not.toHaveBeenCalled();
  });
});
