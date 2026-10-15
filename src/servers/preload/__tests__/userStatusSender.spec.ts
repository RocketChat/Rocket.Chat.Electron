import { createUserStatusSender } from '../userStatusSender';

type Callback = (err?: { error?: unknown; reason?: unknown }) => void;

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const setup = ({
  methodError,
  response = { ok: true, status: 200, json: async () => ({ success: true }) },
  credentials = { userId: 'u1', authToken: 't1' },
}: {
  methodError?: { error?: unknown; reason?: unknown };
  response?: { ok: boolean; status: number; json: () => Promise<unknown> };
  credentials?: { userId: string; authToken: string } | null;
} = {}) => {
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
    getCredentials: () => credentials,
  });
  return { callMethod, fetchFn, send };
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
});
