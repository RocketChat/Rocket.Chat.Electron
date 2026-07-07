/**
 * @jest-environment jsdom
 */
export {};

const mockRequest = jest.fn();
jest.mock('../../store', () => ({
  request: (...args: unknown[]) => mockRequest(...args),
}));

describe('screenSharing/preload', () => {
  const windowTop = {
    postMessage: jest.fn(),
  };

  beforeEach(() => {
    mockRequest.mockReset();
    windowTop.postMessage.mockReset();
    Object.defineProperty(window, 'top', {
      configurable: true,
      value: windowTop,
    });
    jest.resetModules();
  });

  it('posts the captured source id when request succeeds', async () => {
    mockRequest.mockResolvedValue('source-id-1');

    const { listenToScreenSharingRequests } = require('../preload');
    listenToScreenSharingRequests();

    window.dispatchEvent(new Event('get-sourceId'));

    await Promise.resolve();
    expect(windowTop.postMessage).toHaveBeenCalledWith(
      { sourceId: 'source-id-1' },
      '*'
    );
  });

  it('posts a permission error when request fails', async () => {
    mockRequest.mockRejectedValue(new Error('blocked'));

    const { listenToScreenSharingRequests } = require('../preload');
    listenToScreenSharingRequests();
    window.dispatchEvent(new Event('get-sourceId'));

    await Promise.resolve();
    expect(windowTop.postMessage).toHaveBeenCalledWith(
      { sourceId: 'PermissionDeniedError' },
      '*'
    );
  });
});
