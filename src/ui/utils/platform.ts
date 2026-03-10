const detectPlatform = (): string => {
  if (process?.platform) {
    return process.platform;
  }

  if (navigator?.platform) {
    const platform = navigator.platform.toLowerCase();
    if (platform.includes('mac') || platform.includes('darwin')) {
      return 'darwin';
    }
    if (platform.includes('win')) {
      return 'win32';
    }
    if (platform.includes('linux')) {
      return 'linux';
    }
  }

  return 'unknown';
};

export const PLATFORM = detectPlatform();

export const isDarwin = PLATFORM === 'darwin';
export const isWin32 = PLATFORM === 'win32';
export const isLinux = PLATFORM === 'linux';
