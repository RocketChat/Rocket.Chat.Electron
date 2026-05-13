jest.mock('electron', () => ({
  ipcRenderer: {
    on: jest.fn(),
  },
}));

type TelephonyPayload = { phoneNumber: string; rawUri: string };

describe('telephony/preload', () => {
  let listenToTelephonyRequests: () => void;
  let onTelephonyCallRequested: (
    cb: (payload: TelephonyPayload) => void
  ) => void;
  let ipcRendererOn: jest.Mock;

  // Simulate an IPC event by extracting the registered handler and calling it.
  const fireIpcEvent = (payload: TelephonyPayload): void => {
    const entry = ipcRendererOn.mock.calls.find(
      ([channel]: [string]) => channel === 'telephony/call-requested'
    );
    if (!entry)
      throw new Error('No handler registered for telephony/call-requested');
    const handler = entry[1] as (_event: unknown, p: TelephonyPayload) => void;
    handler({}, payload);
  };

  beforeEach(() => {
    jest.resetModules();

    // Re-acquire mock and module after reset so state is fresh each test.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ipcRenderer } = require('electron') as {
      ipcRenderer: { on: jest.Mock };
    };
    ipcRendererOn = ipcRenderer.on;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('../preload') as {
      listenToTelephonyRequests: () => void;
      onTelephonyCallRequested: (
        cb: (payload: TelephonyPayload) => void
      ) => void;
    };
    listenToTelephonyRequests = mod.listenToTelephonyRequests;
    onTelephonyCallRequested = mod.onTelephonyCallRequested;
  });

  it('registers ONE handler for channel telephony/call-requested on ipcRenderer', () => {
    listenToTelephonyRequests();

    expect(ipcRendererOn).toHaveBeenCalledTimes(1);
    expect(ipcRendererOn).toHaveBeenCalledWith(
      'telephony/call-requested',
      expect.any(Function)
    );
  });

  it('calling listenToTelephonyRequests twice still registers only ONE handler', () => {
    listenToTelephonyRequests();
    listenToTelephonyRequests();

    expect(ipcRendererOn).toHaveBeenCalledTimes(1);
  });

  it('buffers payload when IPC event arrives before callback is registered, then flushes on registration', () => {
    listenToTelephonyRequests();

    const payload: TelephonyPayload = {
      phoneNumber: '1234',
      rawUri: 'tel:1234',
    };
    fireIpcEvent(payload);

    const cb = jest.fn();
    onTelephonyCallRequested(cb);

    // Buffered payload flushed synchronously on registration.
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(payload);

    // Firing another event after registration should call the callback directly (not buffer).
    const payload2: TelephonyPayload = {
      phoneNumber: '5678',
      rawUri: 'tel:5678',
    };
    fireIpcEvent(payload2);

    expect(cb).toHaveBeenCalledTimes(2);
    expect(cb).toHaveBeenLastCalledWith(payload2);
  });

  it('calls callback directly when it is registered before the IPC event arrives', () => {
    listenToTelephonyRequests();

    const cb = jest.fn();
    onTelephonyCallRequested(cb);

    const payload: TelephonyPayload = {
      phoneNumber: '9999',
      rawUri: 'tel:9999',
    };
    fireIpcEvent(payload);

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(payload);
  });

  it('delivers empty phone payloads so the renderer can open an empty dial pad', () => {
    listenToTelephonyRequests();

    const cb = jest.fn();
    onTelephonyCallRequested(cb);

    const payload: TelephonyPayload = {
      phoneNumber: '',
      rawUri: '',
    };
    fireIpcEvent(payload);

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(payload);
  });

  it('replacing callback: next IPC event fires the new callback only', () => {
    listenToTelephonyRequests();

    const cb1 = jest.fn();
    const cb2 = jest.fn();

    onTelephonyCallRequested(cb1);
    onTelephonyCallRequested(cb2);

    const payload: TelephonyPayload = {
      phoneNumber: '0000',
      rawUri: 'callto:0000',
    };
    fireIpcEvent(payload);

    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledWith(payload);
  });

  it('pendingPayload is cleared after flush — second onTelephonyCallRequested call does not re-deliver it', () => {
    listenToTelephonyRequests();

    const payload: TelephonyPayload = {
      phoneNumber: '1111',
      rawUri: 'tel:1111',
    };
    fireIpcEvent(payload);

    const cb1 = jest.fn();
    onTelephonyCallRequested(cb1);
    // cb1 receives the buffered payload.
    expect(cb1).toHaveBeenCalledTimes(1);

    // Register a second callback — pendingPayload should be null now.
    const cb2 = jest.fn();
    onTelephonyCallRequested(cb2);

    expect(cb2).not.toHaveBeenCalled();
  });
});
