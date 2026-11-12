import { app } from 'electron';

import { readSetting } from '../../store/readSetting';
import { performElectronStartup, setupGpuCrashHandler } from './app';

jest.mock('fs');

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
    getGPUFeatureStatus: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    relaunch: jest.fn(),
    exit: jest.fn(),
    isPackaged: true,
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

const RELAUNCH_ENV = 'ROCKETCHAT_GPU_FALLBACK_RELAUNCHED';

const softwareGpuStatus = {
  gpu_compositing: 'disabled_software',
  webgl: 'unavailable_software',
};

const hardwareGpuStatus = {
  gpu_compositing: 'enabled',
  webgl: 'enabled',
};

const originalPlatform = process.platform;
const originalEnv = process.env;
const originalArgv = process.argv;

const fireGpuInfoUpdate = () => {
  const call = (app.once as jest.Mock).mock.calls.find(
    ([event]) => event === 'gpu-info-update'
  );
  call?.[1]();
};

const fireGpuProcessGone = () => {
  const call = (app.on as jest.Mock).mock.calls.find(
    ([event]) => event === 'child-process-gone'
  );
  call?.[1]({}, { type: 'GPU' });
};

const startApp = () => {
  performElectronStartup();
  setupGpuCrashHandler();
};

describe('setupGpuCrashHandler (GH #3176)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    Object.defineProperty(process, 'platform', {
      value: 'linux',
      configurable: true,
    });
    process.env = { ...originalEnv, DISPLAY: ':0' };
    delete process.env.APPIMAGE;
    delete process.env.WAYLAND_DISPLAY;
    delete process.env.XDG_SESSION_TYPE;
    delete process.env[RELAUNCH_ENV];
    process.argv = ['/opt/Rocket.Chat/rocketchat-desktop'];
    (readSetting as jest.Mock).mockReturnValue(undefined);
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      configurable: true,
    });
    process.env = originalEnv;
    process.argv = originalArgv;
    jest.restoreAllMocks();
  });

  it('relaunches once with --disable-gpu when the GPU is software-only', () => {
    (app.getGPUFeatureStatus as jest.Mock).mockReturnValue(softwareGpuStatus);

    startApp();
    fireGpuInfoUpdate();

    expect(app.relaunch).toHaveBeenCalledTimes(1);
    expect((app.relaunch as jest.Mock).mock.calls[0][0].args).toEqual(
      expect.arrayContaining(['--disable-gpu', '--ozone-platform=x11'])
    );
    expect(process.env[RELAUNCH_ENV]).toBe('1');
  });

  it('does not relaunch when the GPU works', () => {
    (app.getGPUFeatureStatus as jest.Mock).mockReturnValue(hardwareGpuStatus);

    startApp();
    fireGpuInfoUpdate();

    expect(app.relaunch).not.toHaveBeenCalled();
  });

  it('does not relaunch when the hardware acceleration setting is off', () => {
    (readSetting as jest.Mock).mockImplementation((key: string) =>
      key === 'isHardwareAccelerationEnabled' ? false : undefined
    );
    (app.getGPUFeatureStatus as jest.Mock).mockReturnValue(softwareGpuStatus);

    startApp();
    fireGpuInfoUpdate();
    fireGpuProcessGone();

    expect(app.disableHardwareAcceleration).toHaveBeenCalled();
    expect(app.relaunch).not.toHaveBeenCalled();
  });

  it('does not relaunch a second time when the relaunch lost --disable-gpu', () => {
    process.env[RELAUNCH_ENV] = '1';
    (app.getGPUFeatureStatus as jest.Mock).mockReturnValue(softwareGpuStatus);

    startApp();
    fireGpuInfoUpdate();
    fireGpuProcessGone();

    expect(app.relaunch).not.toHaveBeenCalled();
    expect(process.env[RELAUNCH_ENV]).toBeUndefined();
  });

  it('does not relaunch when started with --disable-gpu', () => {
    process.argv = ['/opt/Rocket.Chat/rocketchat-desktop', '--disable-gpu'];
    (app.getGPUFeatureStatus as jest.Mock).mockReturnValue(softwareGpuStatus);

    startApp();
    fireGpuInfoUpdate();

    expect(app.relaunch).not.toHaveBeenCalled();
  });
});
