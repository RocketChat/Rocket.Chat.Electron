import { handle } from '../../ipc/renderer';
import initNotificationsRenderer from '../renderer';

jest.mock('../../ipc/renderer', () => ({
  handle: jest.fn(),
}));

const mockHandle = handle as jest.Mock;
const mockFetch = jest.fn();

const createMockResponse = (
  bytes: number[],
  contentType: string | null = null
) => ({
  arrayBuffer: jest.fn().mockResolvedValue(new Uint8Array(bytes).buffer),
  headers: {
    get: jest.fn().mockReturnValue(contentType),
  },
});

describe('notifications/renderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = mockFetch as never;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('registers an ipc handler for notifications/fetch-icon', () => {
    initNotificationsRenderer();

    expect(mockHandle).toHaveBeenCalledWith(
      'notifications/fetch-icon',
      expect.any(Function)
    );
  });

  it('fetches icon bytes and emits a PNG data URI using detected content type', async () => {
    const pngBytes = [0x89, 0x50, 0x4e, 0x47];
    mockFetch.mockResolvedValue(createMockResponse(pngBytes, 'image/png'));

    initNotificationsRenderer();

    const handler = mockHandle.mock.calls[0]?.[1] as (
      url: string
    ) => Promise<string>;
    const response = await handler('https://chat.example/avatar.png');
    const expectedBase64 = Buffer.from(new Uint8Array(pngBytes)).toString(
      'base64'
    );

    expect(mockFetch).toHaveBeenCalledWith('https://chat.example/avatar.png');
    expect(response).toBe(`data:image/png;base64,${expectedBase64}`);
  });

  it('falls back to response content-type when image signature is unknown', async () => {
    const bytes = [0x00, 0x11, 0x22];
    mockFetch.mockResolvedValue(createMockResponse(bytes, 'image/jpeg'));

    initNotificationsRenderer();

    const handler = mockHandle.mock.calls[0]?.[1] as (
      url: string
    ) => Promise<string>;
    const response = await handler('https://chat.example/avatar.unknown');
    const expectedBase64 = Buffer.from(new Uint8Array(bytes)).toString(
      'base64'
    );

    expect(response).toBe(`data:image/jpeg;base64,${expectedBase64}`);
  });

  it('reuses cached icon data for repeated URL requests', async () => {
    const bytes = [0x01, 0x02, 0x03];
    mockFetch.mockResolvedValue(createMockResponse(bytes, 'image/png'));

    initNotificationsRenderer();

    const handler = mockHandle.mock.calls[0]?.[1] as (
      url: string
    ) => Promise<string>;
    const url = 'https://chat.example/avatar-cache.png';
    const first = await handler(url);
    const second = await handler(url);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
  });
});
