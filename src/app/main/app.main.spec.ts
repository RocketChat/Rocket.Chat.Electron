import { app } from 'electron';

import { performElectronStartup } from './app';

jest.mock('electron', () => ({
  app: {
    setAsDefaultProtocolClient: jest.fn(),
    setAppUserModelId: jest.fn(),
    commandLine: {
      appendSwitch: jest.fn(),
      hasSwitch: jest.fn(),
    },
    disableHardwareAcceleration: jest.fn(),
    requestSingleInstanceLock: jest.fn(() => true),
    getPath: jest.fn(() => '/test/path'),
    isPackaged: false,
  },
}));

jest.mock('../../store/readSetting', () => ({
  readSetting: jest.fn(() => undefined),
}));

jest.mock('rimraf', () => ({
  rimraf: {
    sync: jest.fn(),
  },
}));

jest.mock('../actions', () => ({
  electronBuilderJsonInformation: {
    protocol: 'rocketchat',
    appId: 'chat.rocket',
  },
}));

const originalPlatform = process.platform;
const originalEnv = process.env;
const originalArgv = process.argv;
const originalConsoleLog = console.log;

describe('performElectronStartup - Platform Detection', () => {
  let appendSwitchMock: jest.Mock;
  let consoleLogMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    appendSwitchMock = app.commandLine.appendSwitch as jest.Mock;
    consoleLogMock = jest.fn();
    console.log = consoleLogMock;

    // Reset process
    Object.defineProperty(process, 'platform', {
      value: 'linux',
      writable: true,
      configurable: true,
    });
    process.env = { ...originalEnv };
    process.argv = ['node', 'script.js'];

    // Clear all environment variables we care about
    delete process.env.XDG_SESSION_TYPE;
    delete process.env.WAYLAND_DISPLAY;
    delete process.env.DISPLAY;
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      writable: true,
      configurable: true,
    });
    process.env = originalEnv;
    process.argv = originalArgv;
    console.log = originalConsoleLog;
  });

  describe('Manual Override Detection', () => {
    it('should respect --ozone-platform=x11 flag', () => {
      process.argv = ['node', 'script.js', '--ozone-platform=x11'];
      process.env.XDG_SESSION_TYPE = 'wayland';
      process.env.WAYLAND_DISPLAY = 'wayland-0';

      performElectronStartup();

      const ozonePlatformCalls = appendSwitchMock.mock.calls.filter(
        (call) => call[0] === 'ozone-platform'
      );
      expect(ozonePlatformCalls).toHaveLength(0);
    });

    it('should respect --ozone-platform=wayland flag', () => {
      process.argv = ['node', 'script.js', '--ozone-platform=wayland'];
      process.env.XDG_SESSION_TYPE = 'x11';

      performElectronStartup();

      const ozonePlatformCalls = appendSwitchMock.mock.calls.filter(
        (call) => call[0] === 'ozone-platform'
      );
      expect(ozonePlatformCalls).toHaveLength(0);
    });

    it('should respect --ozone-platform=auto flag', () => {
      process.argv = ['node', 'script.js', '--ozone-platform=auto'];
      process.env.XDG_SESSION_TYPE = 'x11';

      performElectronStartup();

      const ozonePlatformCalls = appendSwitchMock.mock.calls.filter(
        (call) => call[0] === 'ozone-platform'
      );
      expect(ozonePlatformCalls).toHaveLength(0);
    });

    it('should not override when manual flag is present', () => {
      process.argv = ['node', 'script.js', '--ozone-platform=x11'];
      delete process.env.XDG_SESSION_TYPE;
      delete process.env.WAYLAND_DISPLAY;

      performElectronStartup();

      const waylandLogs = consoleLogMock.mock.calls.filter((call) =>
        call[0]?.includes('Wayland')
      );
      const x11Logs = consoleLogMock.mock.calls.filter((call) =>
        call[0]?.includes('X11')
      );
      expect(waylandLogs).toHaveLength(0);
      expect(x11Logs).toHaveLength(0);
    });
  });

  describe('Wayland Detection', () => {
    it('should use Wayland when XDG_SESSION_TYPE=wayland AND WAYLAND_DISPLAY is set', () => {
      process.env.XDG_SESSION_TYPE = 'wayland';
      process.env.WAYLAND_DISPLAY = 'wayland-0';

      performElectronStartup();

      const ozonePlatformCalls = appendSwitchMock.mock.calls.filter(
        (call) => call[0] === 'ozone-platform'
      );
      expect(ozonePlatformCalls).toHaveLength(0);

      const waylandLog = consoleLogMock.mock.calls.find((call) =>
        call[0]?.includes('Using Wayland platform')
      );
      expect(waylandLog).toBeDefined();
      expect(JSON.parse(waylandLog[1])).toEqual({
        sessionType: 'wayland',
        waylandDisplay: 'wayland-0',
      });
    });

    it('should force X11 when XDG_SESSION_TYPE=wayland but WAYLAND_DISPLAY is unset', () => {
      process.env.XDG_SESSION_TYPE = 'wayland';
      delete process.env.WAYLAND_DISPLAY;

      performElectronStartup();

      expect(appendSwitchMock).toHaveBeenCalledWith('ozone-platform', 'x11');

      const x11Log = consoleLogMock.mock.calls.find((call) =>
        call[0]?.includes('Forcing X11 platform')
      );
      expect(x11Log).toBeDefined();
      const logData = JSON.parse(x11Log[1]);
      expect(logData.reason).toBe('no-wayland-display');
      expect(logData.sessionType).toBe('wayland');
      expect(logData.waylandDisplay).toBe('unset');
    });

    it('should force X11 when XDG_SESSION_TYPE=wayland but WAYLAND_DISPLAY is empty string', () => {
      process.env.XDG_SESSION_TYPE = 'wayland';
      process.env.WAYLAND_DISPLAY = '';

      performElectronStartup();

      expect(appendSwitchMock).toHaveBeenCalledWith('ozone-platform', 'x11');

      const x11Log = consoleLogMock.mock.calls.find((call) =>
        call[0]?.includes('Forcing X11 platform')
      );
      expect(x11Log).toBeDefined();
      const logData = JSON.parse(x11Log[1]);
      expect(logData.reason).toBe('no-wayland-display');
    });

    it('should force X11 when XDG_SESSION_TYPE=wayland but WAYLAND_DISPLAY is whitespace only', () => {
      process.env.XDG_SESSION_TYPE = 'wayland';
      process.env.WAYLAND_DISPLAY = '   ';

      performElectronStartup();

      expect(appendSwitchMock).toHaveBeenCalledWith('ozone-platform', 'x11');

      const x11Log = consoleLogMock.mock.calls.find((call) =>
        call[0]?.includes('Forcing X11 platform')
      );
      expect(x11Log).toBeDefined();
      const logData = JSON.parse(x11Log[1]);
      expect(logData.reason).toBe('no-wayland-display');
    });
  });

  describe('X11 Detection', () => {
    it('should force X11 when XDG_SESSION_TYPE=x11', () => {
      process.env.XDG_SESSION_TYPE = 'x11';

      performElectronStartup();

      expect(appendSwitchMock).toHaveBeenCalledWith('ozone-platform', 'x11');

      const x11Log = consoleLogMock.mock.calls.find((call) =>
        call[0]?.includes('Forcing X11 platform')
      );
      expect(x11Log).toBeDefined();
      const logData = JSON.parse(x11Log[1]);
      expect(logData.reason).toBe('x11-session');
      expect(logData.sessionType).toBe('x11');
    });

    it('should force X11 when XDG_SESSION_TYPE is unset', () => {
      delete process.env.XDG_SESSION_TYPE;

      performElectronStartup();

      expect(appendSwitchMock).toHaveBeenCalledWith('ozone-platform', 'x11');

      const x11Log = consoleLogMock.mock.calls.find((call) =>
        call[0]?.includes('Forcing X11 platform')
      );
      expect(x11Log).toBeDefined();
      const logData = JSON.parse(x11Log[1]);
      expect(logData.reason).toBe('no-session-type');
      expect(logData.sessionType).toBe('unset');
    });

    it('should force X11 when XDG_SESSION_TYPE is empty string', () => {
      process.env.XDG_SESSION_TYPE = '';

      performElectronStartup();

      expect(appendSwitchMock).toHaveBeenCalledWith('ozone-platform', 'x11');

      const x11Log = consoleLogMock.mock.calls.find((call) =>
        call[0]?.includes('Forcing X11 platform')
      );
      expect(x11Log).toBeDefined();
      const logData = JSON.parse(x11Log[1]);
      expect(logData.reason).toBe('no-session-type');
    });
  });

  describe('Invalid Session Type Handling', () => {
    it('should force X11 when XDG_SESSION_TYPE=tty', () => {
      process.env.XDG_SESSION_TYPE = 'tty';

      performElectronStartup();

      expect(appendSwitchMock).toHaveBeenCalledWith('ozone-platform', 'x11');

      const x11Log = consoleLogMock.mock.calls.find((call) =>
        call[0]?.includes('Forcing X11 platform')
      );
      expect(x11Log).toBeDefined();
      const logData = JSON.parse(x11Log[1]);
      expect(logData.reason).toBe('invalid-session-type');
      expect(logData.sessionType).toBe('tty');
    });

    it('should force X11 when XDG_SESSION_TYPE=mir', () => {
      process.env.XDG_SESSION_TYPE = 'mir';

      performElectronStartup();

      expect(appendSwitchMock).toHaveBeenCalledWith('ozone-platform', 'x11');

      const x11Log = consoleLogMock.mock.calls.find((call) =>
        call[0]?.includes('Forcing X11 platform')
      );
      expect(x11Log).toBeDefined();
      const logData = JSON.parse(x11Log[1]);
      expect(logData.reason).toBe('invalid-session-type');
    });

    it('should force X11 for any invalid session type', () => {
      process.env.XDG_SESSION_TYPE = 'unknown';

      performElectronStartup();

      expect(appendSwitchMock).toHaveBeenCalledWith('ozone-platform', 'x11');

      const x11Log = consoleLogMock.mock.calls.find((call) =>
        call[0]?.includes('Forcing X11 platform')
      );
      expect(x11Log).toBeDefined();
      const logData = JSON.parse(x11Log[1]);
      expect(logData.reason).toBe('invalid-session-type');
      expect(logData.sessionType).toBe('unknown');
    });
  });

  describe('Normalization', () => {
    it('should trim whitespace from XDG_SESSION_TYPE', () => {
      process.env.XDG_SESSION_TYPE = '  wayland  ';
      process.env.WAYLAND_DISPLAY = 'wayland-0';

      performElectronStartup();

      const waylandLog = consoleLogMock.mock.calls.find((call) =>
        call[0]?.includes('Using Wayland platform')
      );
      expect(waylandLog).toBeDefined();
      const logData = JSON.parse(waylandLog[1]);
      expect(logData.sessionType).toBe('wayland');
    });

    it('should trim whitespace from WAYLAND_DISPLAY', () => {
      process.env.XDG_SESSION_TYPE = 'wayland';
      process.env.WAYLAND_DISPLAY = '  wayland-0  ';

      performElectronStartup();

      const waylandLog = consoleLogMock.mock.calls.find((call) =>
        call[0]?.includes('Using Wayland platform')
      );
      expect(waylandLog).toBeDefined();
      const logData = JSON.parse(waylandLog[1]);
      expect(logData.waylandDisplay).toBe('wayland-0');
    });

    it('should handle XDG_SESSION_TYPE with leading/trailing spaces', () => {
      process.env.XDG_SESSION_TYPE = ' x11 ';
      process.env.WAYLAND_DISPLAY = 'wayland-0';

      performElectronStartup();

      expect(appendSwitchMock).toHaveBeenCalledWith('ozone-platform', 'x11');

      const x11Log = consoleLogMock.mock.calls.find((call) =>
        call[0]?.includes('Forcing X11 platform')
      );
      expect(x11Log).toBeDefined();
      const logData = JSON.parse(x11Log[1]);
      expect(logData.sessionType).toBe('x11');
    });

    it('should handle WAYLAND_DISPLAY with leading/trailing spaces', () => {
      process.env.XDG_SESSION_TYPE = 'wayland';
      process.env.WAYLAND_DISPLAY = ' wayland-0 ';

      performElectronStartup();

      const waylandLog = consoleLogMock.mock.calls.find((call) =>
        call[0]?.includes('Using Wayland platform')
      );
      expect(waylandLog).toBeDefined();
      const logData = JSON.parse(waylandLog[1]);
      expect(logData.waylandDisplay).toBe('wayland-0');
    });
  });

  describe('Logging', () => {
    it('should log messages with valid JSON structure', () => {
      process.env.XDG_SESSION_TYPE = 'wayland';
      process.env.WAYLAND_DISPLAY = 'wayland-0';

      performElectronStartup();

      const waylandLog = consoleLogMock.mock.calls.find((call) =>
        call[0]?.includes('Using Wayland platform')
      );
      expect(waylandLog).toBeDefined();
      expect(waylandLog).toHaveLength(2);
      expect(typeof waylandLog[0]).toBe('string');
      const logData = JSON.parse(waylandLog[1]);
      expect(logData).toHaveProperty('sessionType');
      expect(logData).toHaveProperty('waylandDisplay');
    });

    it('should log X11 messages with reason code in JSON', () => {
      process.env.XDG_SESSION_TYPE = 'x11';

      performElectronStartup();

      const x11Log = consoleLogMock.mock.calls.find((call) =>
        call[0]?.includes('Forcing X11 platform')
      );
      expect(x11Log).toBeDefined();
      expect(x11Log).toHaveLength(2);
      expect(typeof x11Log[0]).toBe('string');
      const logData = JSON.parse(x11Log[1]);
      expect(logData).toHaveProperty('reason');
      expect(logData).toHaveProperty('sessionType');
    });
  });

  describe('Platform-Specific Behavior', () => {
    it('should only run detection on Linux platform', () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true,
        configurable: true,
      });
      process.env.XDG_SESSION_TYPE = 'x11';

      performElectronStartup();

      const ozonePlatformCalls = appendSwitchMock.mock.calls.filter(
        (call) => call[0] === 'ozone-platform'
      );
      expect(ozonePlatformCalls).toHaveLength(0);
    });

    it('should not affect non-Linux platforms', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true,
        configurable: true,
      });
      process.env.XDG_SESSION_TYPE = 'wayland';
      process.env.WAYLAND_DISPLAY = 'wayland-0';

      performElectronStartup();

      const ozonePlatformCalls = appendSwitchMock.mock.calls.filter(
        (call) => call[0] === 'ozone-platform'
      );
      expect(ozonePlatformCalls).toHaveLength(0);
    });
  });

  describe('Integration', () => {
    it('should work correctly with PipeWire feature enabled', () => {
      process.env.XDG_SESSION_TYPE = 'x11';

      performElectronStartup();

      expect(appendSwitchMock).toHaveBeenCalledWith(
        'enable-features',
        'WebRTCPipeWireCapturer'
      );
      expect(appendSwitchMock).toHaveBeenCalledWith('ozone-platform', 'x11');
    });

    it('should not interfere with other command line switches', () => {
      process.env.XDG_SESSION_TYPE = 'wayland';
      process.env.WAYLAND_DISPLAY = 'wayland-0';

      performElectronStartup();

      expect(appendSwitchMock).toHaveBeenCalledWith(
        'autoplay-policy',
        'no-user-gesture-required'
      );
      expect(appendSwitchMock).toHaveBeenCalledWith(
        'enable-features',
        'WebRTCPipeWireCapturer'
      );

      const ozonePlatformCalls = appendSwitchMock.mock.calls.filter(
        (call) => call[0] === 'ozone-platform'
      );
      expect(ozonePlatformCalls).toHaveLength(0);
    });
  });
});
