import { app } from 'electron';

import { cleanupOldLogs } from './cleanup';

const { existsSync, readdirSync, statSync, unlinkSync } = jest.requireMock<
  typeof import('fs')
>('fs');
const nowSpy = jest.spyOn(Date, 'now');

jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(),
  },
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readdirSync: jest.fn(),
  statSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

describe('logging/cleanup', () => {
  const fixedNow = new Date('2026-07-07T00:00:00.000Z');
  const logsPath = '/logs';

  beforeEach(() => {
    jest.clearAllMocks();
    (app.getPath as jest.Mock).mockReturnValue(logsPath);
    (existsSync as jest.Mock).mockReturnValue(true);
    (readdirSync as jest.Mock).mockReturnValue([]);
    (statSync as jest.Mock).mockReturnValue({
      isFile: () => true,
      mtime: fixedNow,
    });
    nowSpy.mockReturnValue(fixedNow.getTime());
  });

  afterEach(() => {
    nowSpy.mockReset();
  });

  it('returns early for invalid retention periods', () => {
    const warnMock = jest.spyOn(console, 'warn').mockImplementation(() => {});

    cleanupOldLogs(-1);

    expect(warnMock).toHaveBeenCalledWith(
      '[logging] Invalid retentionDays; skipping log cleanup'
    );
    expect(existsSync).not.toHaveBeenCalled();
    warnMock.mockRestore();
  });

  it('returns when logs directory does not exist', () => {
    (existsSync as jest.Mock).mockReturnValue(false);

    cleanupOldLogs(30);

    expect(readdirSync).not.toHaveBeenCalled();
  });

  it('removes only expired non-protected log files', () => {
    const oldTime = new Date('2026-07-05T00:00:00.000Z');
    const freshTime = new Date('2026-07-06T23:00:00.000Z');
    const infoMock = jest.spyOn(console, 'info').mockImplementation(() => {});

    (readdirSync as jest.Mock).mockReturnValue([
      'main.log',
      'errors.jsonl',
      'old.log',
      'folder',
      'still-good.log',
    ]);
    (statSync as jest.Mock).mockImplementation((filePath: string) => ({
      isFile: () => !filePath.includes('folder'),
      mtime: filePath.includes('old.log') ? oldTime : freshTime,
    }));

    cleanupOldLogs(1);

    expect(unlinkSync).toHaveBeenCalledTimes(1);
    expect(unlinkSync).toHaveBeenCalledWith(`${logsPath}/old.log`);
    expect(infoMock).toHaveBeenCalledWith(
      '[logging] Cleaned up 1 old log file(s)'
    );
    infoMock.mockRestore();
  });

  it('ignores files it cannot stat', () => {
    (readdirSync as jest.Mock).mockReturnValue(['broken.log']);
    (statSync as jest.Mock).mockImplementation(() => {
      throw new Error('permission denied');
    });

    cleanupOldLogs(1);

    expect(unlinkSync).not.toHaveBeenCalled();
  });

  it('warns when cleanup encounters a fatal error', () => {
    const warnMock = jest.spyOn(console, 'warn').mockImplementation(() => {});
    (app.getPath as jest.Mock).mockImplementation(() => {
      throw new Error('missing logs path');
    });

    cleanupOldLogs(1);

    expect(warnMock).toHaveBeenCalledWith(
      '[logging] Failed to cleanup old logs:',
      expect.any(Error)
    );
    warnMock.mockRestore();
  });

  it('uses default retention days when no retention period is provided', () => {
    const oldTime = new Date('2026-06-01T00:00:00.000Z');
    const infoMock = jest.spyOn(console, 'info').mockImplementation(() => {});
    (readdirSync as jest.Mock).mockReturnValue(['old.log']);
    (statSync as jest.Mock).mockReturnValue({
      isFile: () => true,
      mtime: oldTime,
    });

    cleanupOldLogs();

    expect(unlinkSync).toHaveBeenCalledWith(`${logsPath}/old.log`);
    expect(infoMock).toHaveBeenCalledWith('[logging] Cleaned up 1 old log file(s)');
    infoMock.mockRestore();
  });
});
