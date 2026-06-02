import { app } from 'electron';

import { getTelephonyDiagnostics } from '../diagnostics';

// child_process.execFile is mocked as a jest.fn() that returns a Promise
// (util.promisify is mocked to return the function unchanged, so the module
// under test calls it directly as a promise-returning function).
jest.mock('child_process', () => ({
  execFile: jest.fn(),
}));

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));

jest.mock('util', () => ({
  promisify: (fn: unknown) => fn,
}));

jest.mock('electron', () => ({
  app: {
    isDefaultProtocolClient: jest.fn<boolean, [string]>(),
    getApplicationInfoForProtocol: jest.fn<
      Promise<{ name: string; path: string; icon: null }>,
      [string]
    >(),
    getName: jest.fn<string, []>(() => 'Rocket.Chat'),
  },
}));

const appMock = app as jest.Mocked<typeof app>;

// Retrieve the mock after jest.mock() factories have run
const getExecFileMock = () =>
  (jest.requireMock('child_process') as { execFile: jest.Mock }).execFile;

const getReadFileMock = () =>
  (jest.requireMock('fs/promises') as { readFile: jest.Mock }).readFile;

const REG_OUTPUT_REGISTERED_APP =
  '\n    Rocket.Chat    REG_SZ    Software\\Rocket.Chat\\Capabilities\n';
const REG_OUTPUT_CAPABILITY_TEL = '\n    tel    REG_SZ    RocketChat.tel\n';
const REG_OUTPUT_PROGID_TEL =
  '\n    (Default)    REG_SZ    "C:\\Program Files\\Rocket.Chat\\Rocket.Chat.exe" -- "%1"\n';

const setPlatform = (platform: NodeJS.Platform): (() => void) => {
  const original = process.platform;
  Object.defineProperty(process, 'platform', {
    value: platform,
    writable: true,
    configurable: true,
  });
  return () =>
    Object.defineProperty(process, 'platform', {
      value: original,
      writable: true,
      configurable: true,
    });
};

// ---------------------------------------------------------------------------
// All-platforms: isDefault checks
// ---------------------------------------------------------------------------

describe('getTelephonyDiagnostics — isDefault checks (all platforms)', () => {
  let restorePlatform: () => void;

  afterEach(() => {
    restorePlatform?.();
    jest.clearAllMocks();
  });

  it('returns pass for tel and callto when isDefaultProtocolClient returns true', async () => {
    restorePlatform = setPlatform('linux');
    appMock.isDefaultProtocolClient.mockReturnValue(true);
    getExecFileMock().mockRejectedValue(new Error('no xdg-mime'));

    const result = await getTelephonyDiagnostics();

    expect(result.checks.find((c) => c.id === 'isDefault.tel')?.status).toBe(
      'pass'
    );
    expect(result.checks.find((c) => c.id === 'isDefault.callto')?.status).toBe(
      'pass'
    );
    expect(result.checks.find((c) => c.id === 'isDefault.sip')).toBeUndefined();
  });

  it('returns fail when isDefaultProtocolClient returns false', async () => {
    restorePlatform = setPlatform('darwin');
    appMock.isDefaultProtocolClient.mockReturnValue(false);
    (appMock.getApplicationInfoForProtocol as jest.Mock).mockRejectedValue(
      new Error('no handler')
    );

    const result = await getTelephonyDiagnostics();

    expect(result.checks.find((c) => c.id === 'isDefault.tel')?.status).toBe(
      'fail'
    );
  });

  it('returns unknown with details when isDefaultProtocolClient throws', async () => {
    restorePlatform = setPlatform('darwin');
    appMock.isDefaultProtocolClient.mockImplementation(() => {
      throw new Error('registry locked');
    });
    (appMock.getApplicationInfoForProtocol as jest.Mock).mockRejectedValue(
      new Error('no handler')
    );

    const result = await getTelephonyDiagnostics();

    const check = result.checks.find((c) => c.id === 'isDefault.tel');
    expect(check?.status).toBe('unknown');
    expect(check?.details).toContain('registry locked');
  });
});

// ---------------------------------------------------------------------------
// Windows checks
// ---------------------------------------------------------------------------

describe('getTelephonyDiagnostics — Windows platform checks', () => {
  let restorePlatform: () => void;

  beforeEach(() => {
    restorePlatform = setPlatform('win32');
    appMock.isDefaultProtocolClient.mockReturnValue(false);
  });

  afterEach(() => {
    restorePlatform();
    jest.clearAllMocks();
  });

  it('windows.registeredApp passes when HKCU has the expected value', async () => {
    getExecFileMock().mockResolvedValue({
      stdout: REG_OUTPUT_REGISTERED_APP,
      stderr: '',
    });

    const result = await getTelephonyDiagnostics();

    const check = result.checks.find((c) => c.id === 'windows.registeredApp');
    expect(check?.status).toBe('pass');
  });

  it('windows.registeredApp fails when both HKCU and HKLM are missing', async () => {
    getExecFileMock().mockRejectedValue(new Error('registry key not found'));

    const result = await getTelephonyDiagnostics();

    const check = result.checks.find((c) => c.id === 'windows.registeredApp');
    expect(check?.status).toBe('fail');
  });

  it('windows.registeredApp passes when HKCU misses but HKLM hits', async () => {
    getExecFileMock()
      .mockRejectedValueOnce(new Error('not found')) // HKCU miss
      .mockResolvedValue({ stdout: REG_OUTPUT_REGISTERED_APP, stderr: '' }); // HKLM hit

    const result = await getTelephonyDiagnostics();

    const check = result.checks.find((c) => c.id === 'windows.registeredApp');
    expect(check?.status).toBe('pass');
  });

  it('windows.capabilities.tel passes with correct ProgID value', async () => {
    getExecFileMock().mockResolvedValue({
      stdout: REG_OUTPUT_CAPABILITY_TEL,
      stderr: '',
    });

    const result = await getTelephonyDiagnostics();

    const check = result.checks.find(
      (c) => c.id === 'windows.capabilities.tel'
    );
    expect(check?.status).toBe('pass');
  });

  it('windows.progid.tel passes when default value contains Rocket.Chat.exe', async () => {
    getExecFileMock().mockResolvedValue({
      stdout: REG_OUTPUT_PROGID_TEL,
      stderr: '',
    });

    const result = await getTelephonyDiagnostics();

    const check = result.checks.find((c) => c.id === 'windows.progid.tel');
    expect(check?.status).toBe('pass');
  });

  it('windows.progid.tel fails when command does not contain Rocket.Chat.exe', async () => {
    getExecFileMock().mockResolvedValue({
      stdout:
        '\n    (Default)    REG_SZ    "C:\\Program Files\\Teams\\Teams.exe" -- "%1"\n',
      stderr: '',
    });

    const result = await getTelephonyDiagnostics();

    const check = result.checks.find((c) => c.id === 'windows.progid.tel');
    expect(check?.status).toBe('fail');
    expect(check?.details).toBeDefined();
  });

  it('returns fail when both hives are missing for a windows check', async () => {
    getExecFileMock().mockRejectedValue(new Error('access denied'));

    const result = await getTelephonyDiagnostics();

    const check = result.checks.find((c) => c.id === 'windows.registeredApp');
    expect(check?.status).toBe('fail');
    expect(check?.details).toBeDefined();
  });

  it('isDefault.tel passes when UserChoice ProgId equals RocketChat.tel', async () => {
    getExecFileMock().mockImplementation((_cmd: string, args: string[]) => {
      const keyPath: string = args[1] ?? '';
      if (keyPath.endsWith('URLAssociations\\tel\\UserChoice')) {
        return Promise.resolve({
          stdout: '\n    ProgId    REG_SZ    RocketChat.tel\n',
          stderr: '',
        });
      }
      return Promise.reject(new Error('not found'));
    });

    const result = await getTelephonyDiagnostics();

    const check = result.checks.find((c) => c.id === 'isDefault.tel');
    expect(check?.status).toBe('pass');
  });

  it('isDefault.tel fails when UserChoice ProgId points to another handler', async () => {
    getExecFileMock().mockImplementation((_cmd: string, args: string[]) => {
      const keyPath: string = args[1] ?? '';
      if (keyPath.endsWith('URLAssociations\\tel\\UserChoice')) {
        return Promise.resolve({
          stdout: '\n    ProgId    REG_SZ    MSTeams.Url.tel\n',
          stderr: '',
        });
      }
      return Promise.reject(new Error('not found'));
    });

    const result = await getTelephonyDiagnostics();

    const check = result.checks.find((c) => c.id === 'isDefault.tel');
    expect(check?.status).toBe('fail');
    expect(check?.details).toContain('MSTeams.Url.tel');
    expect(check?.action).toBe('openDefaultAppsSettings');
  });

  it('isDefault.tel passes when UserChoice is missing but UserChoiceLatest equals RocketChat.tel', async () => {
    getExecFileMock().mockImplementation((_cmd: string, args: string[]) => {
      const keyPath: string = args[1] ?? '';
      if (keyPath.endsWith('URLAssociations\\tel\\UserChoice')) {
        return Promise.reject(new Error('not found'));
      }
      if (keyPath.endsWith('URLAssociations\\tel\\UserChoiceLatest\\ProgId')) {
        return Promise.resolve({
          stdout: '\n    ProgId    REG_SZ    RocketChat.tel\n',
          stderr: '',
        });
      }
      return Promise.reject(new Error('not found'));
    });

    const result = await getTelephonyDiagnostics();

    const check = result.checks.find((c) => c.id === 'isDefault.tel');
    expect(check?.status).toBe('pass');
  });

  it('isDefault.tel fails when UserChoiceLatest points to another handler even if the protocol class launches Rocket.Chat', async () => {
    getExecFileMock().mockImplementation((_cmd: string, args: string[]) => {
      const keyPath: string = args[1] ?? '';
      if (keyPath.endsWith('URLAssociations\\tel\\UserChoice')) {
        return Promise.reject(new Error('not found'));
      }
      if (keyPath.endsWith('URLAssociations\\tel\\UserChoiceLatest\\ProgId')) {
        return Promise.resolve({
          stdout: '\n    ProgId    REG_SZ    ChromeHTML\n',
          stderr: '',
        });
      }
      if (keyPath.includes('Software\\Classes\\tel\\shell\\open\\command')) {
        return Promise.resolve({
          stdout: REG_OUTPUT_PROGID_TEL,
          stderr: '',
        });
      }
      return Promise.reject(new Error('not found'));
    });

    const result = await getTelephonyDiagnostics();

    const check = result.checks.find((c) => c.id === 'isDefault.tel');
    expect(check?.status).toBe('fail');
    expect(check?.details).toContain('ChromeHTML');
    expect(check?.action).toBe('openDefaultAppsSettings');
  });

  it('isDefault.tel passes when no user choice is set but the protocol class launches the current Electron executable', async () => {
    const originalExecPath = process.execPath;
    Object.defineProperty(process, 'execPath', {
      value:
        'C:\\Users\\jean\\repo\\node_modules\\electron\\dist\\electron.exe',
      writable: true,
      configurable: true,
    });

    getExecFileMock().mockImplementation((_cmd: string, args: string[]) => {
      const keyPath: string = args[1] ?? '';
      if (keyPath.endsWith('URLAssociations\\tel\\UserChoice')) {
        return Promise.reject(new Error('not found'));
      }
      if (keyPath.endsWith('URLAssociations\\tel\\UserChoiceLatest\\ProgId')) {
        return Promise.reject(new Error('not found'));
      }
      if (keyPath.includes('Software\\Classes\\tel\\shell\\open\\command')) {
        return Promise.resolve({
          stdout:
            '\n    (Default)    REG_SZ    "C:\\Users\\jean\\repo\\node_modules\\electron\\dist\\electron.exe" "%1"\n',
          stderr: '',
        });
      }
      return Promise.reject(new Error('not found'));
    });

    let status;
    try {
      const result = await getTelephonyDiagnostics();
      status = result.checks.find((c) => c.id === 'isDefault.tel')?.status;
    } finally {
      Object.defineProperty(process, 'execPath', {
        value: originalExecPath,
        writable: true,
        configurable: true,
      });
    }

    expect(status).toBe('pass');
  });

  it('isDefault.callto passes when no user choice is set but the protocol class launches Rocket.Chat.exe', async () => {
    getExecFileMock().mockImplementation((_cmd: string, args: string[]) => {
      const keyPath: string = args[1] ?? '';
      if (keyPath.endsWith('URLAssociations\\callto\\UserChoice')) {
        return Promise.reject(new Error('not found'));
      }
      if (
        keyPath.endsWith('URLAssociations\\callto\\UserChoiceLatest\\ProgId')
      ) {
        return Promise.reject(new Error('not found'));
      }
      if (keyPath.includes('Software\\Classes\\callto\\shell\\open\\command')) {
        return Promise.resolve({
          stdout:
            '\n    (Default)    REG_SZ    "C:\\Program Files\\Rocket.Chat\\Rocket.Chat.exe" "%1"\n',
          stderr: '',
        });
      }
      return Promise.reject(new Error('not found'));
    });

    const result = await getTelephonyDiagnostics();

    const check = result.checks.find((c) => c.id === 'isDefault.callto');
    expect(check?.status).toBe('pass');
  });

  it('isDefault.tel fails when no UserChoice ProgId is set', async () => {
    getExecFileMock().mockRejectedValue(new Error('not found'));

    const result = await getTelephonyDiagnostics();

    const check = result.checks.find((c) => c.id === 'isDefault.tel');
    expect(check?.status).toBe('fail');
    expect(check?.details).toContain('default apps');
    expect(check?.action).toBe('openDefaultAppsSettings');
  });
});

// ---------------------------------------------------------------------------
// macOS checks
// ---------------------------------------------------------------------------

describe('getTelephonyDiagnostics — macOS platform checks', () => {
  let restorePlatform: () => void;
  const originalExecPath = process.execPath;

  const setExecPath = (value: string): void => {
    Object.defineProperty(process, 'execPath', {
      value,
      writable: true,
      configurable: true,
    });
  };

  beforeEach(() => {
    restorePlatform = setPlatform('darwin');
    appMock.isDefaultProtocolClient.mockReturnValue(false);
  });

  afterEach(() => {
    restorePlatform();
    setExecPath(originalExecPath);
    jest.clearAllMocks();
  });

  it('darwin.handler.tel passes when process.execPath lives inside the handler bundle (packaged)', async () => {
    setExecPath('/Applications/Rocket.Chat.app/Contents/MacOS/Rocket.Chat');
    (appMock.getApplicationInfoForProtocol as jest.Mock).mockResolvedValue({
      name: 'Rocket.Chat',
      path: '/Applications/Rocket.Chat.app',
      icon: null,
    });

    const result = await getTelephonyDiagnostics();

    const check = result.checks.find((c) => c.id === 'darwin.handler.tel');
    expect(check?.status).toBe('pass');
    expect(check?.details).toContain('Rocket.Chat');
  });

  it('darwin.handler.tel passes in dev across sibling worktrees (basename match)', async () => {
    setExecPath(
      '/Users/jean/repo-a/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'
    );
    (appMock.getApplicationInfoForProtocol as jest.Mock).mockResolvedValue({
      name: 'Electron.app',
      path: '/Users/jean/repo-b/node_modules/electron/dist/Electron.app',
      icon: null,
    });

    const result = await getTelephonyDiagnostics();

    const check = result.checks.find((c) => c.id === 'darwin.handler.tel');
    expect(check?.status).toBe('pass');
  });

  it('darwin.handler.tel fails when handler bundle does not contain process.execPath', async () => {
    setExecPath('/Applications/Rocket.Chat.app/Contents/MacOS/Rocket.Chat');
    (appMock.getApplicationInfoForProtocol as jest.Mock).mockResolvedValue({
      name: 'FaceTime',
      path: '/System/Applications/FaceTime.app',
      icon: null,
    });

    const result = await getTelephonyDiagnostics();

    const check = result.checks.find((c) => c.id === 'darwin.handler.tel');
    expect(check?.status).toBe('fail');
    expect(check?.details).toContain('FaceTime');
  });

  it('darwin.handler.* returns unknown when getApplicationInfoForProtocol throws', async () => {
    (appMock.getApplicationInfoForProtocol as jest.Mock).mockRejectedValue(
      new Error('no handler registered')
    );

    const result = await getTelephonyDiagnostics();

    const check = result.checks.find((c) => c.id === 'darwin.handler.tel');
    expect(check?.status).toBe('unknown');
    expect(check?.details).toContain('no handler registered');
  });
});

// ---------------------------------------------------------------------------
// Linux checks
// ---------------------------------------------------------------------------

describe('getTelephonyDiagnostics — Linux platform checks', () => {
  let restorePlatform: () => void;

  beforeEach(() => {
    restorePlatform = setPlatform('linux');
    appMock.isDefaultProtocolClient.mockReturnValue(false);
  });

  afterEach(() => {
    restorePlatform();
    jest.clearAllMocks();
  });

  it('linux.xdg.tel passes when stdout contains "rocketchat"', async () => {
    getExecFileMock().mockResolvedValue({
      stdout: 'rocketchat.desktop\n',
      stderr: '',
    });

    const result = await getTelephonyDiagnostics();

    const check = result.checks.find((c) => c.id === 'linux.xdg.tel');
    expect(check?.status).toBe('pass');
    expect(check?.details).toBe('rocketchat.desktop');
  });

  it('linux.xdg.tel passes when the default desktop file launches Rocket.Chat', async () => {
    getExecFileMock().mockResolvedValue({
      stdout: 'chat.desktop\n',
      stderr: '',
    });
    getReadFileMock().mockResolvedValue(
      '[Desktop Entry]\nExec=/opt/Rocket.Chat/rocket.chat %u\n'
    );

    const result = await getTelephonyDiagnostics();

    const check = result.checks.find((c) => c.id === 'linux.xdg.tel');
    expect(check?.status).toBe('pass');
    expect(check?.details).toContain('Exec=/opt/Rocket.Chat/rocket.chat %u');
  });

  it('linux.xdg.tel passes in dev when the default desktop file launches the current executable', async () => {
    const originalExecPath = process.execPath;
    Object.defineProperty(process, 'execPath', {
      value: '/home/jean/repo/node_modules/electron/dist/electron',
      writable: true,
      configurable: true,
    });

    getExecFileMock().mockResolvedValue({
      stdout: 'electron.desktop\n',
      stderr: '',
    });
    getReadFileMock().mockResolvedValue(
      '[Desktop Entry]\nExec=/home/jean/repo/node_modules/electron/dist/electron %u\n'
    );

    let status;
    try {
      const result = await getTelephonyDiagnostics();
      status = result.checks.find((c) => c.id === 'linux.xdg.tel')?.status;
    } finally {
      Object.defineProperty(process, 'execPath', {
        value: originalExecPath,
        writable: true,
        configurable: true,
      });
    }

    expect(status).toBe('pass');
  });

  it('linux.xdg.tel fails when stdout is for a different app', async () => {
    getExecFileMock().mockResolvedValue({
      stdout: 'facetime.desktop\n',
      stderr: '',
    });
    getReadFileMock().mockRejectedValue(new Error('not found'));

    const result = await getTelephonyDiagnostics();

    const check = result.checks.find((c) => c.id === 'linux.xdg.tel');
    expect(check?.status).toBe('fail');
    expect(check?.details).toBe('facetime.desktop');
    expect(check?.action).toBe('openDefaultAppsSettings');
  });

  it('linux.xdg.* returns unknown when execFile rejects', async () => {
    getExecFileMock().mockRejectedValue(new Error('xdg-mime not found'));

    const result = await getTelephonyDiagnostics();

    const check = result.checks.find((c) => c.id === 'linux.xdg.tel');
    expect(check?.status).toBe('unknown');
    expect(check?.details).toContain('xdg-mime not found');
  });
});

// ---------------------------------------------------------------------------
// Resilience
// ---------------------------------------------------------------------------

describe('getTelephonyDiagnostics — resilience', () => {
  let restorePlatform: () => void;

  afterEach(() => {
    restorePlatform?.();
    jest.clearAllMocks();
  });

  it('resolves and never throws even when every subcall errors', async () => {
    restorePlatform = setPlatform('linux');
    appMock.isDefaultProtocolClient.mockImplementation(() => {
      throw new Error('electron exploded');
    });
    getExecFileMock().mockRejectedValue(new Error('execFile exploded'));

    await expect(getTelephonyDiagnostics()).resolves.toBeDefined();
  });

  it('returns an object with platform and generatedAt fields', async () => {
    restorePlatform = setPlatform('darwin');
    appMock.isDefaultProtocolClient.mockReturnValue(false);
    (appMock.getApplicationInfoForProtocol as jest.Mock).mockRejectedValue(
      new Error('no handler')
    );

    const result = await getTelephonyDiagnostics();

    expect(result.platform).toBe('darwin');
    expect(typeof result.generatedAt).toBe('string');
    expect(() => new Date(result.generatedAt)).not.toThrow();
    expect(Array.isArray(result.checks)).toBe(true);
  });
});
