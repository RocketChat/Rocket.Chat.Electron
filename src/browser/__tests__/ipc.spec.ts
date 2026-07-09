import { handle } from '../../ipc/main';
import { openExternal } from '../../utils/browserLauncher';
import { startBrowserHandler } from '../ipc';

jest.mock('electron', () => ({
  app: {},
}));

jest.mock('../../utils/browserLauncher', () => ({
  openExternal: jest.fn(),
}));

jest.mock('../../ipc/main', () => ({ handle: jest.fn() }));

const mockedHandle = jest.mocked(handle);

describe('browser/ipc', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedHandle.mockClear();
  });

  it('registers browser/open-url handler', () => {
    startBrowserHandler();
    expect(mockedHandle).toHaveBeenCalledWith(
      'browser/open-url',
      expect.any(Function)
    );
  });

  it('opens http urls through openExternal', async () => {
    startBrowserHandler();
    const handler = mockedHandle.mock.calls[0][1];

    await handler({} as any, 'https://example.com/path');
    expect(openExternal).toHaveBeenCalledWith('https://example.com/path');
  });

  it('opens https urls through openExternal', async () => {
    startBrowserHandler();
    const handler = mockedHandle.mock.calls[0][1];

    await handler({} as any, 'https://example.org');
    expect(openExternal).toHaveBeenCalledWith('https://example.org/');
  });

  it('ignores non-http urls', async () => {
    startBrowserHandler();
    const handler = mockedHandle.mock.calls[0][1];

    await handler({} as any, 'ftp://example.com');
    expect(openExternal).not.toHaveBeenCalled();
  });

  it('ignores invalid urls', async () => {
    startBrowserHandler();
    const handler = mockedHandle.mock.calls[0][1];

    await handler({} as any, '://bad');
    expect(openExternal).not.toHaveBeenCalled();
  });
});
