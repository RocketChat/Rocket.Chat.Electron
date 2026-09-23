export {};

type IpcListener = () => void;

const ipcListeners = new Map<string, IpcListener>();
const on = jest.fn((channel: string, listener: IpcListener) => {
  ipcListeners.set(channel, listener);
});
const invoke = jest.fn();
const openInternalVideoChatWindow = jest.fn();

jest.mock('electron', () => ({
  ipcRenderer: {
    on: (channel: string, listener: IpcListener) => on(channel, listener),
  },
}));
jest.mock('../../ipc/renderer', () => ({
  invoke: (...args: unknown[]) => invoke(...args),
}));
jest.mock('./internalVideoChatWindow', () => ({
  openInternalVideoChatWindow: (...args: unknown[]) =>
    openInternalVideoChatWindow(...args),
}));

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('servers/preload/conferenceWindow', () => {
  let listenToConferenceWindowRequests: () => void;

  beforeEach(async () => {
    jest.resetModules();
    ipcListeners.clear();
    on.mockClear();
    invoke.mockReset();
    openInternalVideoChatWindow.mockClear();
    ({ listenToConferenceWindowRequests } = await import('./conferenceWindow'));
  });

  it('opens a conference queued before the preload started listening', async () => {
    invoke.mockResolvedValueOnce('https://chat.example/conference/abc');

    listenToConferenceWindowRequests();
    await flush();

    expect(invoke).toHaveBeenCalledWith('server-view/take-pending-conference');
    expect(openInternalVideoChatWindow).toHaveBeenCalledWith(
      'https://chat.example/conference/abc',
      { providerName: 'pexip' }
    );
  });

  it('pulls the queued conference when the main process signals a new one', async () => {
    invoke.mockResolvedValueOnce(null);
    listenToConferenceWindowRequests();
    await flush();
    expect(openInternalVideoChatWindow).not.toHaveBeenCalled();

    invoke.mockResolvedValueOnce(
      'https://chat.example/conference/abc?scheduled=true'
    );
    ipcListeners.get('server-view/conference-requested')?.();
    await flush();

    expect(openInternalVideoChatWindow).toHaveBeenCalledTimes(1);
    expect(openInternalVideoChatWindow).toHaveBeenCalledWith(
      'https://chat.example/conference/abc?scheduled=true',
      { providerName: 'pexip' }
    );
  });

  it('registers the listener only once', () => {
    invoke.mockResolvedValue(null);
    listenToConferenceWindowRequests();
    listenToConferenceWindowRequests();

    expect(on).toHaveBeenCalledTimes(1);
  });

  it('logs instead of throwing when the pull fails', async () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    invoke.mockRejectedValueOnce(new Error('ipc down'));

    listenToConferenceWindowRequests();
    await flush();

    expect(openInternalVideoChatWindow).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
