// The main process must not load the native search module. Without a binary
// for it (Linux with glibc below 2.34, Windows ia32 with no prebuild), a
// main-process require stops the whole app at startup. The utility process
// worker loads it, and it falls back to the snapshot store when that fails.
jest.mock('better-sqlite3-multiple-ciphers', () => {
  throw new Error('native module must not load in the main process');
});

describe('e2eeSearch in the main process', () => {
  it('loads the setup and the key store without the native search module', () => {
    expect(() => {
      require('../setup');
      require('../keyStore');
    }).not.toThrow();
  });
});
