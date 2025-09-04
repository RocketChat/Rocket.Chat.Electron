import { jest } from '@jest/globals';

// Mock Electron modules
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/mock/path'),
    getVersion: jest.fn(() => '1.0.0'),
    on: jest.fn(),
    once: jest.fn(),
    removeListener: jest.fn(),
    getAppMetrics: jest.fn(() => []),
  },
  webContents: {
    getAllWebContents: jest.fn(() => []),
    getFocusedWebContents: jest.fn(() => null),
  },
  dialog: {
    showMessageBox: jest.fn(),
  },
  powerMonitor: {
    on: jest.fn(),
    removeListener: jest.fn(),
  },
  BrowserWindow: {
    getAllWindows: jest.fn(() => []),
    getFocusedWindow: jest.fn(() => null),
  },
}));

// Mock os module
jest.mock('os', () => ({
  totalmem: jest.fn(() => 16 * 1024 * 1024 * 1024), // 16GB
  freemem: jest.fn(() => 8 * 1024 * 1024 * 1024), // 8GB
  platform: jest.fn(() => 'darwin'),
  cpus: jest.fn(() => [1, 2, 3, 4]), // 4 cores
}));

// Setup test environment
beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// Helper function to create mock WebContents
export function createMockWebContents(overrides = {}): any {
  return {
    id: Math.random(),
    getURL: jest.fn(() => 'https://example.com'),
    reload: jest.fn(),
    executeJavaScript: jest.fn(),
    isDestroyed: jest.fn(() => false),
    isLoading: jest.fn(() => false),
    on: jest.fn(),
    once: jest.fn(),
    removeListener: jest.fn(),
    send: jest.fn(),
    ...overrides,
  };
}

// Helper function to create mock process memory info
export function createMockMemoryInfo(overrides = {}): any {
  return {
    workingSetSize: 100 * 1024, // 100MB in KB
    peakWorkingSetSize: 150 * 1024,
    privateBytes: 80 * 1024,
    sharedBytes: 20 * 1024,
    ...overrides,
  };
}

// Helper function to simulate memory pressure
export function simulateMemoryPressure(level: 'moderate' | 'critical') {
  const totalMemory = 16 * 1024 * 1024 * 1024;
  const freeMemory = level === 'critical' 
    ? totalMemory * 0.05  // 5% free for critical
    : totalMemory * 0.15; // 15% free for moderate
    
  const os = require('os');
  (os.freemem as jest.Mock).mockReturnValue(freeMemory);
}

// Helper to advance timers and flush promises
export async function advanceTimersAndFlush(ms: number) {
  jest.advanceTimersByTime(ms);
  await Promise.resolve(); // Flush promise queue
}

export default {};