import { PortalPickerProvider } from '../providers/PortalPickerProvider';
import type { DisplayMediaCallback } from '../types';

const getSources = jest.fn();

jest.mock('electron', () => ({
  desktopCapturer: {
    getSources: (...args: unknown[]) => getSources(...args),
  },
}));

describe('PortalPickerProvider', () => {
  let provider: PortalPickerProvider;
  const callback = jest.fn() as jest.MockedFunction<DisplayMediaCallback>;

  beforeEach(() => {
    provider = new PortalPickerProvider();
    getSources.mockReset();
    callback.mockReset();
  });

  it('falls back to video false when no sources are selected', async () => {
    getSources.mockResolvedValue([]);

    await provider.initialize();
    await provider.handleDisplayMediaRequest(callback);

    expect(callback).toHaveBeenCalledWith({ video: false } as any);
  });

  it('returns first source when available', async () => {
    getSources.mockResolvedValue([
      { id: 's1', name: 'screen', toDataURL: () => '' },
    ]);

    await provider.handleDisplayMediaRequest(callback);
    await Promise.resolve();
    expect(callback).toHaveBeenCalledWith({
      video: expect.objectContaining({ id: 's1', name: 'screen' }),
    });
  });

  it('returns false on desktop capturer error', async () => {
    getSources.mockRejectedValue(new Error('nope'));
    const errorCallback = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    await provider.handleDisplayMediaRequest(callback);
    await Promise.resolve();
    expect(callback).toHaveBeenCalledWith({ video: false } as any);
    errorCallback.mockRestore();
  });

  it('supports no-op initialize and cleanup', async () => {
    await provider.initialize();
    expect(() => provider.cleanup()).not.toThrow();
  });
});
