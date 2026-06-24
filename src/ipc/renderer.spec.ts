import type { IpcRendererEvent } from 'electron';
import { ipcRenderer } from 'electron';

import { handle, invoke, invokeWithRetry } from './renderer';

jest.mock('electron', () => ({
  ipcRenderer: {
    invoke: jest.fn(),
    on: jest.fn(),
    send: jest.fn(),
    removeListener: jest.fn(),
  },
}));

const mockInvoke = ipcRenderer.invoke as jest.Mock;
const mockOn = ipcRenderer.on as jest.Mock;
const mockSend = ipcRenderer.send as jest.Mock;
const mockRemoveListener = ipcRenderer.removeListener as jest.Mock;

const CHANNEL = 'server-view/get-url' as any;
const fakeEvent = {} as IpcRendererEvent;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  (console.log as jest.Mock).mockRestore();
  (console.error as jest.Mock).mockRestore();
});

describe('invoke', () => {
  it('forwards channel and args to ipcRenderer.invoke and returns its result', async () => {
    mockInvoke.mockResolvedValue('the-url');

    const result = await invoke(CHANNEL, 'arg1' as never, 'arg2' as never);

    expect(mockInvoke).toHaveBeenCalledWith(CHANNEL, 'arg1', 'arg2');
    expect(result).toBe('the-url');
  });
});

describe('handle', () => {
  it('registers a listener on the channel and returns a disposer', () => {
    const dispose = handle(CHANNEL, jest.fn());

    expect(mockOn).toHaveBeenCalledWith(CHANNEL, expect.any(Function));

    const listener = mockOn.mock.calls[0][1];
    dispose();
    expect(mockRemoveListener).toHaveBeenCalledWith(CHANNEL, listener);
  });

  it('sends the resolved value back on the per-request reply channel', async () => {
    const handler = jest.fn().mockResolvedValue('resolved-value');
    handle(CHANNEL, handler);
    const listener = mockOn.mock.calls[0][1];

    await listener(fakeEvent, 'req-id', 'a', 'b');

    expect(handler).toHaveBeenCalledWith('a', 'b');
    expect(mockSend).toHaveBeenCalledWith(`${CHANNEL}@req-id`, {
      resolved: 'resolved-value',
    });
  });

  it('sends a serialized rejection when the handler throws an Error', async () => {
    const error = new Error('handler boom');
    const handler = jest.fn().mockRejectedValue(error);
    handle(CHANNEL, handler);
    const listener = mockOn.mock.calls[0][1];

    await listener(fakeEvent, 'req-id');

    expect(mockSend).toHaveBeenCalledWith(`${CHANNEL}@req-id`, {
      rejected: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    });
  });

  it('does not send a reply when the rejection is not an Error', async () => {
    const handler = jest.fn().mockRejectedValue('plain string');
    handle(CHANNEL, handler);
    const listener = mockOn.mock.calls[0][1];

    await listener(fakeEvent, 'req-id');

    expect(mockSend).not.toHaveBeenCalled();
  });
});

describe('invokeWithRetry', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the result on the first successful attempt', async () => {
    mockInvoke.mockResolvedValue('ok');

    const result = await invokeWithRetry(CHANNEL, {}, 'x' as never);

    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(mockInvoke).toHaveBeenCalledWith(CHANNEL, 'x');
    expect(result).toBe('ok');
  });

  it('treats { success: false } results as a failure and retries', async () => {
    mockInvoke
      .mockResolvedValueOnce({ success: false })
      .mockResolvedValueOnce({ success: true });

    const promise = invokeWithRetry(CHANNEL, { retryDelay: 10 });
    await jest.advanceTimersByTimeAsync(10);
    const result = await promise;

    expect(mockInvoke).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ success: true });
  });

  it('retries on thrown errors up to maxAttempts then rejects', async () => {
    mockInvoke.mockRejectedValue(new Error('always fails'));

    const promise = invokeWithRetry(CHANNEL, {
      maxAttempts: 3,
      retryDelay: 5,
    });
    const assertion = expect(promise).rejects.toThrow('always fails');

    await jest.advanceTimersByTimeAsync(5); // after attempt 1
    await jest.advanceTimersByTimeAsync(5); // after attempt 2
    await assertion;

    expect(mockInvoke).toHaveBeenCalledTimes(3);
  });

  it('gives up immediately when shouldRetry returns false', async () => {
    mockInvoke.mockRejectedValue(new Error('non-retryable'));
    const shouldRetry = jest.fn().mockReturnValue(false);

    await expect(invokeWithRetry(CHANNEL, { shouldRetry })).rejects.toThrow(
      'non-retryable'
    );

    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(shouldRetry).toHaveBeenCalledWith(expect.any(Error), 1);
  });

  it('suppresses retry logging when logRetries is false', async () => {
    mockInvoke.mockRejectedValue(new Error('quiet failure'));

    await expect(
      invokeWithRetry(CHANNEL, {
        maxAttempts: 1,
        logRetries: false,
      })
    ).rejects.toThrow('quiet failure');

    expect(console.log).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });

  it('logs retry progress and the give-up message when logRetries is true', async () => {
    mockInvoke.mockRejectedValue(new Error('logged failure'));

    const promise = invokeWithRetry(CHANNEL, {
      maxAttempts: 2,
      retryDelay: 5,
    });
    const assertion = expect(promise).rejects.toThrow('logged failure');
    await jest.advanceTimersByTimeAsync(5);
    await assertion;

    expect(console.log).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('IPC call giving up'),
      expect.any(Error)
    );
  });
});
