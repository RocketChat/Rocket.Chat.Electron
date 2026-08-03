import { ServerUrlResolutionStatus } from '../common';
import { convertToURL, resolveServerUrl } from '../main';

jest.mock('electron', () => ({
  app: { getPath: jest.fn(() => '/tmp'), getAppPath: jest.fn(() => '/app') },
}));

jest.mock('../../app/main/app', () => ({
  packageJsonInformation: { productName: 'Rocket.Chat', version: '4.0.0' },
}));

const invoke = jest.fn();
jest.mock('../../ipc/main', () => ({
  invoke: (...args: any[]) => invoke(...args),
}));

jest.mock('../../store', () => ({
  select: jest.fn(),
  dispatch: jest.fn(),
  listen: jest.fn(() => jest.fn()),
  watch: jest.fn(() => jest.fn()),
}));

jest.mock('../../ui/main/rootWindow', () => ({
  getRootWindow: jest.fn(async () => ({ webContents: { id: 1 } })),
}));

jest.mock('../../ui/main/serverView', () => ({
  getWebContentsByServerUrl: jest.fn(),
}));

describe('resolveServerUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns INVALID_URL for garbage input', async () => {
    const [input, status, error] = await resolveServerUrl('://bad');
    expect(status).toBe(ServerUrlResolutionStatus.INVALID_URL);
    expect(error).toBeTruthy();
    expect(input).toBe('://bad');
  });

  it('returns OK for compatible server version', async () => {
    invoke.mockResolvedValue(['https://open.rocket.chat/', '6.5.0']);
    const [url, status] = await resolveServerUrl('https://open.rocket.chat');
    expect(status).toBe(ServerUrlResolutionStatus.OK);
    expect(url).toContain('open.rocket.chat');
  });

  it('returns INVALID for incompatible server version', async () => {
    invoke.mockResolvedValue(['https://open.rocket.chat/', '1.0.0']);
    const [, status, error] = await resolveServerUrl(
      'https://open.rocket.chat'
    );
    expect(status).toBe(ServerUrlResolutionStatus.INVALID);
    expect(String(error?.message || error)).toMatch(/incompatible/i);
  });

  it('returns INVALID when fetch fails for absolute urls', async () => {
    invoke.mockRejectedValue(new Error('network'));
    const [, status] = await resolveServerUrl('https://down.example');
    expect(status).toBe(ServerUrlResolutionStatus.INVALID);
  });

  it('returns TIMEOUT when fetch aborts', async () => {
    const err = new Error('aborted');
    err.name = 'AbortError';
    invoke.mockRejectedValue(err);
    const [, status] = await resolveServerUrl('https://slow.example');
    expect(status).toBe(ServerUrlResolutionStatus.TIMEOUT);
  });

  it('convertToURL is used for bare hostnames', () => {
    expect(convertToURL('chat.example').hostname).toBe('chat.example');
  });

  it('retries as a rocket.chat subdomain for bare-word input and returns INVALID on failure', async () => {
    invoke.mockRejectedValue(new Error('network'));
    const [, status] = await resolveServerUrl('myworkspace');
    expect(status).toBe(ServerUrlResolutionStatus.INVALID);
    expect(invoke).toHaveBeenCalledWith(
      expect.anything(),
      'servers/fetch-info',
      'https://myworkspace.rocket.chat/'
    );
  });
});
