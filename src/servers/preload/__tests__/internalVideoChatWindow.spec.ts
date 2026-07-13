export {};

type IpcListener = (
  event: unknown,
  payload: { callUrl?: unknown; provider?: unknown }
) => void;

const ipcListeners = new Map<string, IpcListener>();
const on = jest.fn((channel: string, listener: IpcListener) => {
  ipcListeners.set(channel, listener);
});
const invoke = jest.fn();

jest.mock('electron', () => ({
  ipcRenderer: {
    on: (channel: string, listener: IpcListener) => on(channel, listener),
    invoke: (...args: unknown[]) => invoke(...args),
  },
}));

const safeSelect = jest.fn();
jest.mock('../../../store', () => ({
  safeSelect: (...args: unknown[]) => safeSelect(...args),
}));

const openExternal = jest.fn();
jest.mock('../../../utils/browserLauncher', () => ({
  openExternal: (...args: unknown[]) => openExternal(...args),
}));

const emit = (payload: { callUrl?: unknown; provider?: unknown }) => {
  const listener = ipcListeners.get('conference/open-call-requested');
  if (!listener) {
    throw new Error(
      'conference/open-call-requested listener was not registered'
    );
  }
  listener({}, payload);
};

// window.location.origin is locked to 'file://' by the real Chromium
// window @kayahr/jest-electron-runner loads (non-configurable, cannot be
// stubbed). The same-origin providerName-enrichment positive path is
// therefore not unit-testable here and is covered by runtime/E2E QA instead.

describe('servers/preload/internalVideoChatWindow', () => {
  beforeEach(() => {
    jest.resetModules();
    ipcListeners.clear();
    on.mockClear();
    invoke.mockClear();
    openExternal.mockClear();
    safeSelect.mockReset();
  });

  it('walks the buffer -> flush -> cross-origin sequence', async () => {
    // isInternalVideoChatWindowEnabled = true for the whole walk so that
    // openInternalVideoChatWindow reaches the ipcRenderer.invoke branch.
    safeSelect.mockImplementation((selector: any) =>
      selector({ isInternalVideoChatWindowEnabled: true })
    );

    const mod = await import('../internalVideoChatWindow');
    const {
      listenToConferenceCallRequests,
      flushPendingConferenceCallRequest,
    } = mod;

    listenToConferenceCallRequests();
    expect(on).toHaveBeenCalledWith(
      'conference/open-call-requested',
      expect.any(Function)
    );

    // A second registration must be a no-op (listening guard).
    listenToConferenceCallRequests();
    expect(on).toHaveBeenCalledTimes(1);

    // 1. Delivered before flush: buffered, not processed yet.
    emit({
      callUrl: 'https://attacker.example/webapp3/conference?conference=v1',
      provider: 'pexip',
    });
    expect(invoke).not.toHaveBeenCalled();

    // 2. Flush drains the buffered request exactly once. The request's
    // origin (https://attacker.example) differs from window.location.origin
    // (file://), so providerName enrichment must NOT apply — this is the
    // security-relevant assertion: cross-origin requests never get enriched.
    flushPendingConferenceCallRequest();
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith(
      'video-call-window/open-window',
      'https://attacker.example/webapp3/conference?conference=v1',
      undefined
    );

    invoke.mockClear();

    // Flushing again with no pending request must not re-process.
    flushPendingConferenceCallRequest();
    expect(invoke).not.toHaveBeenCalled();

    // 3. A second cross-origin callUrl with a provider, delivered after
    // ready, processes immediately with the same no-enrichment guarantee.
    emit({
      callUrl:
        'https://pexip.other-tenant.example/webapp3/conference?conference=v2',
      provider: 'Pexip',
    });
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith(
      'video-call-window/open-window',
      'https://pexip.other-tenant.example/webapp3/conference?conference=v2',
      undefined
    );
  });

  it('ignores a payload without a callUrl', async () => {
    safeSelect.mockImplementation((selector: any) =>
      selector({ isInternalVideoChatWindowEnabled: true })
    );

    const mod = await import('../internalVideoChatWindow');
    mod.listenToConferenceCallRequests();
    mod.flushPendingConferenceCallRequest();

    emit({ provider: 'pexip' });

    expect(invoke).not.toHaveBeenCalled();
    expect(openExternal).not.toHaveBeenCalled();
  });
});
