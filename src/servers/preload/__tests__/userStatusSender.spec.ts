import { createUserStatusSender } from '../userStatusSender';

type Callback = (err?: { error?: unknown; reason?: unknown }) => void;

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const setup = ({
  methodError,
  response = { ok: true, status: 200, json: async () => ({ success: true }) },
  credentials = { userId: 'u1', authToken: 't1' },
}: {
  methodError?: { error?: unknown; reason?: unknown };
  response?: {
    ok: boolean;
    status: number;
    json: () => Promise<unknown>;
    headers?: { get: (name: string) => string | null };
  };
  credentials?: { userId: string; authToken: string } | null;
} = {}) => {
  let currentCredentials = credentials;
  const callMethod = jest.fn(
    (
      _method: string,
      _status: string,
      _text: string | undefined,
      cb: Callback
    ) => cb(methodError)
  );
  const fetchFn = jest.fn(async () => response) as unknown as jest.Mock;
  const send = createUserStatusSender({
    callMethod,
    fetchFn: fetchFn as unknown as typeof fetch,
    getServerUrl: () => 'https://chat.example.com/sub/',
    getCredentials: () => currentCredentials,
  });
  const setCredentials = (next: typeof credentials) => {
    currentCredentials = next;
  };
  return { callMethod, fetchFn, send, setCredentials };
};

describe('createUserStatusSender', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses the setUserStatus method while the server has it', async () => {
    const { callMethod, fetchFn, send } = setup();

    send({ status: 'busy', statusText: 'In a meeting' });
    await flush();

    expect(callMethod).toHaveBeenCalledWith(
      'setUserStatus',
      'busy',
      'In a meeting',
      expect.any(Function)
    );
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('falls back to users.setStatus when the method is not found, and keeps using it', async () => {
    const { callMethod, fetchFn, send } = setup({
      methodError: { error: 404, reason: "Method 'setUserStatus' not found" },
    });

    send({ status: 'away', statusText: 'Lunch' });
    await flush();

    expect(fetchFn).toHaveBeenCalledWith(
      'https://chat.example.com/sub/api/v1/users.setStatus',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': 'u1',
          'X-Auth-Token': 't1',
        },
        body: JSON.stringify({ status: 'away', message: 'Lunch' }),
      }
    );

    send({ status: 'online' });
    await flush();

    expect(callMethod).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchFn.mock.calls[1][1].body)).toEqual({
      status: 'online',
    });
  });

  it('does not fall back on an expected rejection', async () => {
    const { fetchFn, send } = setup({
      methodError: { error: 'error-status-not-allowed' },
    });

    send({ status: 'offline' });
    await flush();

    expect(fetchFn).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(
      '[Rocket.Chat Desktop] setUserStatus rejected: error-status-not-allowed'
    );
  });

  it('logs a REST rejection as a warning', async () => {
    const { send } = setup({
      methodError: { error: 404 },
      response: {
        ok: false,
        status: 400,
        json: async () => ({ success: false, errorType: 'error-not-allowed' }),
      },
    });

    send({ status: 'busy', statusText: 'x' });
    await flush();

    expect(console.warn).toHaveBeenCalledWith(
      '[Rocket.Chat Desktop] users.setStatus rejected: error-not-allowed'
    );
    expect(console.error).not.toHaveBeenCalled();
  });

  it('sends nothing over REST without credentials', async () => {
    const { fetchFn, send } = setup({
      methodError: { error: 404 },
      credentials: null,
    });

    send({ status: 'busy' });
    await flush();

    expect(fetchFn).not.toHaveBeenCalled();
  });

  describe('when users.setStatus is rate limited', () => {
    const rateLimited = (resetInMs: number) => ({
      ok: false,
      status: 429,
      json: async () => ({ success: false }),
      headers: {
        get: (name: string) =>
          name === 'X-RateLimit-Reset' ? String(Date.now() + resetInMs) : null,
      },
    });

    beforeEach(() => {
      jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

    it('retries the status after the limit resets', async () => {
      const { fetchFn, send } = setup({
        methodError: { error: 404 },
        response: rateLimited(5000),
      });

      send({ status: 'away' });
      await flushPromises();
      expect(fetchFn).toHaveBeenCalledTimes(1);

      fetchFn.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });
      jest.advanceTimersByTime(4999);
      await flushPromises();
      expect(fetchFn).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(1);
      await flushPromises();
      expect(fetchFn).toHaveBeenCalledTimes(2);
      expect(JSON.parse(fetchFn.mock.calls[1][1].body)).toEqual({
        status: 'away',
      });
    });

    it('drops the pending retry when a newer status is sent', async () => {
      const { fetchFn, send } = setup({
        methodError: { error: 404 },
        response: rateLimited(5000),
      });

      send({ status: 'away' });
      await flushPromises();

      fetchFn.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });
      send({ status: 'busy' });
      await flushPromises();
      jest.advanceTimersByTime(60_000);
      await flushPromises();

      expect(fetchFn).toHaveBeenCalledTimes(2);
      expect(JSON.parse(fetchFn.mock.calls[1][1].body)).toEqual({
        status: 'busy',
      });
    });

    it('does not retry for a different user', async () => {
      const { fetchFn, send, setCredentials } = setup({
        methodError: { error: 404 },
        response: rateLimited(5000),
      });

      send({ status: 'away' });
      await flushPromises();
      setCredentials({ userId: 'u2', authToken: 't2' });
      jest.advanceTimersByTime(5000);
      await flushPromises();

      expect(fetchFn).toHaveBeenCalledTimes(1);
    });
  });

  it('skips the REST fallback when the user changed before the method replied', async () => {
    let reply: Callback = () => undefined;
    const { callMethod, fetchFn, send, setCredentials } = setup();
    callMethod.mockImplementation((_m, _s, _t, cb) => {
      reply = cb;
    });

    send({ status: 'busy' });
    setCredentials({ userId: 'u2', authToken: 't2' });
    reply({ error: 404 });
    await flush();

    expect(fetchFn).not.toHaveBeenCalled();
  });
});
