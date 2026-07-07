jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(),
  },
}));
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
}));

describe('readSetting', () => {
  let readSetting: typeof import('../readSetting').readSetting;
  let readFileSyncMock: jest.Mock;
  let appGetPathMock: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    ({ readSetting } = require('../readSetting'));

    ({ readFileSync: readFileSyncMock } = require('fs'));
    ({ app: { getPath: appGetPathMock } } = require('electron'));

    appGetPathMock.mockReturnValue('/tmp/user-data');
    readFileSyncMock.mockReset();
  });

  it('returns value for an existing key', () => {
    readFileSyncMock.mockReturnValue(
      JSON.stringify({ theme: 'dark', maxItems: 5 })
    );

    expect(readSetting('theme')).toBe('dark');
  });

  it('returns null when file read fails', () => {
    readFileSyncMock.mockImplementation(() => {
      throw new Error('missing file');
    });

    expect(readSetting('theme')).toBeNull();
  });

  it('returns null when json cannot be parsed', () => {
    readFileSyncMock.mockReturnValue('{invalid-json');
    expect(readSetting('theme')).toBeNull();
  });
});
