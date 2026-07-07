const loadPlatformModule = (processPlatform: string, navigatorPlatform?: string|null) => {
  const processDescriptor = Object.getOwnPropertyDescriptor(process, 'platform');
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(
    globalThis as { [k: string]: unknown },
    'navigator'
  );

  Object.defineProperty(process, 'platform', {
    configurable: true,
    value: processPlatform,
  });

  if (navigatorPlatform === undefined) {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: navigatorDescriptor?.value,
    });
  } else {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: navigatorPlatform === null ? undefined : { platform: navigatorPlatform },
    });
  }

  jest.resetModules();

  const mod = require('../platform') as typeof import('../platform');

  return {
    module: mod,
    restore: () => {
      if (processDescriptor) {
        Object.defineProperty(process, 'platform', processDescriptor);
      }
      if (navigatorDescriptor) {
        Object.defineProperty(globalThis, 'navigator', navigatorDescriptor);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete (globalThis as { navigator?: unknown }).navigator;
      }
    },
  };
};

describe('ui/utils/platform', () => {
  it('uses process.platform when available', () => {
    const result = loadPlatformModule('darwin', null);
    try {
      expect(result.module.PLATFORM).toBe('darwin');
      expect(result.module.isDarwin).toBe(true);
      expect(result.module.isWin32).toBe(false);
      expect(result.module.isLinux).toBe(false);
    } finally {
      result.restore();
    }
  });

  it('detects platform from navigator.platform when process.platform is empty', () => {
    const result = loadPlatformModule('', 'Linux x86_64');
    try {
      expect(result.module.PLATFORM).toBe('linux');
      expect(result.module.isDarwin).toBe(false);
      expect(result.module.isWin32).toBe(false);
      expect(result.module.isLinux).toBe(true);
    } finally {
      result.restore();
    }
  });

  it('falls back to unknown when platform cannot be detected', () => {
    const result = loadPlatformModule('', 'PlayStation');
    try {
      expect(result.module.PLATFORM).toBe('unknown');
      expect(result.module.isDarwin).toBe(false);
      expect(result.module.isWin32).toBe(false);
      expect(result.module.isLinux).toBe(false);
    } finally {
      result.restore();
    }
  });
});
