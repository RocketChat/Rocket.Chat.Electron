jest.mock('electron', () => ({
  app: {},
}));

jest.mock('../../utils/browserLauncher', () => ({
  openExternal: jest.fn(),
}));

const handle = jest.fn();
jest.mock('../../ipc/main', () => ({ handle }));

const { openExternal } = require('../../utils/browserLauncher');
const { startBrowserHandler } = require('../ipc');
const { handle: mockedHandle } = require('../../ipc/main');

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

    await handler({}, 'https://example.com/path');
    expect(openExternal).toHaveBeenCalledWith('https://example.com/path');
  });

  it('opens https urls through openExternal', async () => {
    startBrowserHandler();
    const handler = mockedHandle.mock.calls[0][1];

    await handler({}, 'https://example.org');
    expect(openExternal).toHaveBeenCalledWith('https://example.org/');
  });

  it('ignores non-http urls', async () => {
    startBrowserHandler();
    const handler = mockedHandle.mock.calls[0][1];

    await handler({}, 'ftp://example.com');
    expect(openExternal).not.toHaveBeenCalled();
  });

  it('ignores invalid urls', async () => {
    startBrowserHandler();
    const handler = mockedHandle.mock.calls[0][1];

    await handler({}, '://bad');
    expect(openExternal).not.toHaveBeenCalled();
  });
});
