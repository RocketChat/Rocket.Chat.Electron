import { InternalPickerProvider } from '../providers/InternalPickerProvider';
import type { DisplayMediaCallback } from '../types';

describe('InternalPickerProvider', () => {
  let provider: InternalPickerProvider;

  beforeEach(() => {
    provider = new InternalPickerProvider();
    jest.clearAllMocks();
  });

  it('invokes callback with false when handler is missing', () => {
    const callback = jest.fn() as jest.MockedFunction<DisplayMediaCallback>;
    provider.handleDisplayMediaRequest(callback);

    expect(callback).toHaveBeenCalledWith(null);
  });

  it('forwards request to provided handler', () => {
    const callback = jest.fn() as jest.MockedFunction<DisplayMediaCallback>;
    const handle = jest.fn((cb: DisplayMediaCallback) => cb(null));

    provider.setHandleRequestHandler(handle);
    provider.handleDisplayMediaRequest(callback);

    expect(handle).toHaveBeenCalledWith(callback, undefined);
    expect(callback).toHaveBeenCalledWith(null);
  });

  it('calls initialize only once and keeps initialized state', async () => {
    const initializeFn = jest.fn(async () => undefined);
    provider.setInitializeHandler(initializeFn);

    await provider.initialize();
    await provider.initialize();

    expect(initializeFn).toHaveBeenCalledTimes(1);
  });

  it('initializes by warning if no handler was set', async () => {
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    await provider.initialize();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('initialize handler not set')
    );
    warn.mockRestore();
  });

  it('resets initialization state on cleanup', async () => {
    const initializeFn = jest.fn(async () => undefined);
    provider.setInitializeHandler(initializeFn);

    await provider.initialize();
    provider.cleanup();
    await provider.initialize();

    expect(initializeFn).toHaveBeenCalledTimes(2);
  });
});
