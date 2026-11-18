import type { EventEmitter } from 'events';
import * as fs from 'fs';

import { app } from 'electron';

import { readSetting } from '../../store/readSetting';
import { performElectronStartup, setupGpuCrashHandler } from './app';

jest.mock('fs');

jest.mock('electron', () => {
  const { EventEmitter } = jest.requireActual('events');
  return {
    app: Object.assign(new EventEmitter(), {
      setAsDefaultProtocolClient: jest.fn(),
      setAppUserModelId: jest.fn(),
      commandLine: {
        appendSwitch: jest.fn(),
        hasSwitch: jest.fn(),
      },
      disableHardwareAcceleration: jest.fn(),
      requestSingleInstanceLock: jest.fn(() => true),
      getPath: jest.fn(() => '/test/path'),
      getGPUFeatureStatus: jest.fn(),
      relaunch: jest.fn(),
      exit: jest.fn(),
      isPackaged: false,
    }),
  };
});

jest.mock('../../store/readSetting', () => ({
  readSetting: jest.fn(),
}));

const originalPlatform = process.platform;
const originalEnv = process.env;
const originalArgv = process.argv;
const events: EventEmitter = app;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  events.removeAllListeners();
  Object.defineProperty(process, 'platform', { value: 'linux' });
  process.env = {
    ...originalEnv,
    XDG_SESSION_TYPE: 'wayland',
    WAYLAND_DISPLAY: 'wayland-0',
    XDG_RUNTIME_DIR: '/run/user/1000',
  };
  delete process.env.APPIMAGE;
  process.argv = ['electron', 'script.js', '--start-hidden'];
  (fs.statSync as jest.Mock).mockReturnValue({ isSocket: () => true });
  (readSetting as jest.Mock).mockImplementation(() => undefined);
  (app.getGPUFeatureStatus as jest.Mock).mockReturnValue({
    gpu_compositing: 'enabled',
    webgl: 'enabled',
  });
  const switches = new Set(
    process.argv
      .filter((arg) => arg.startsWith('--'))
      .map((arg) => arg.slice(2))
  );
  (app.commandLine.appendSwitch as jest.Mock).mockImplementation(
    (name: string) => switches.add(name)
  );
  (app.commandLine.hasSwitch as jest.Mock).mockImplementation((name: string) =>
    switches.has(name)
  );
});

afterEach(() => {
  events.removeAllListeners();
  jest.restoreAllMocks();
  Object.defineProperty(process, 'platform', { value: originalPlatform });
  process.env = originalEnv;
  process.argv = originalArgv;
});

it.each(['setting', 'launch argument', 'appended switch'])(
  'does not relaunch or force X11 when acceleration is disabled via %s',
  (source) => {
    if (source === 'setting') {
      (readSetting as jest.Mock).mockImplementation((key: string) =>
        key === 'isHardwareAccelerationEnabled' ? false : undefined
      );
    } else if (source === 'launch argument') {
      process.argv.push('--disable-gpu');
    } else {
      app.commandLine.appendSwitch('disable-gpu');
    }
    performElectronStartup();
    setupGpuCrashHandler();

    (app.getGPUFeatureStatus as jest.Mock).mockReturnValue({
      gpu_compositing: 'disabled_software',
      webgl: 'unavailable_software',
    });
    events.emit('gpu-info-update');
    events.emit('child-process-gone', {}, { type: 'GPU', reason: 'crashed' });

    expect(app.relaunch).not.toHaveBeenCalled();
    expect(app.exit).not.toHaveBeenCalled();
    expect(app.commandLine.appendSwitch).not.toHaveBeenCalledWith(
      'ozone-platform',
      'x11'
    );
  }
);

it('keeps a healthy accelerated Wayland session running', () => {
  performElectronStartup();
  setupGpuCrashHandler();

  events.emit('gpu-info-update');
  events.emit('child-process-gone', {}, { type: 'Utility', reason: 'crashed' });

  expect(app.getGPUFeatureStatus).toHaveBeenCalledTimes(1);
  expect(app.relaunch).not.toHaveBeenCalled();
  expect(app.exit).not.toHaveBeenCalled();
});

it.each([
  { gpu_compositing: 'disabled_software', webgl: 'enabled' },
  { gpu_compositing: 'enabled', webgl: 'unavailable_software' },
  { gpu_compositing: 'unavailable', webgl: 'enabled' },
  { gpu_compositing: 'enabled' },
])(
  'recovers unavailable GPU features when acceleration is enabled: %p',
  (status) => {
    performElectronStartup();
    setupGpuCrashHandler();
    (app.getGPUFeatureStatus as jest.Mock).mockReturnValue(status);

    events.emit('gpu-info-update');

    expect(app.relaunch).toHaveBeenCalledWith({
      args: [
        'script.js',
        '--disable-gpu',
        '--ozone-platform=x11',
        '--start-hidden',
      ],
    });
    expect(app.exit).toHaveBeenCalledTimes(1);
  }
);

it('still recovers a GPU process crash when acceleration is enabled', () => {
  performElectronStartup();
  setupGpuCrashHandler();

  events.emit('child-process-gone', {}, { type: 'GPU', reason: 'crashed' });

  expect(app.relaunch).toHaveBeenCalledWith({
    args: [
      'script.js',
      '--disable-gpu',
      '--ozone-platform=x11',
      '--start-hidden',
    ],
  });
  expect(app.exit).toHaveBeenCalledTimes(1);
});

it.each(['darwin', 'win32'])(
  'does not install Linux GPU recovery on %s',
  (platform) => {
    Object.defineProperty(process, 'platform', { value: platform });
    setupGpuCrashHandler();

    events.emit('gpu-info-update');
    events.emit('child-process-gone', {}, { type: 'GPU', reason: 'crashed' });

    expect(app.getGPUFeatureStatus).not.toHaveBeenCalled();
    expect(app.relaunch).not.toHaveBeenCalled();
    expect(app.exit).not.toHaveBeenCalled();
  }
);
