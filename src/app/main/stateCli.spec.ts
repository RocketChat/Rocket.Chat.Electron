import fs from 'fs';
import path from 'path';

import { app } from 'electron';

import * as store from '../../store';
import {
  exportStateToCli,
  getCommandLineSwitch,
  loadStateFromCli,
} from './stateCli';

jest.mock('electron', () => ({
  app: {
    commandLine: {
      hasSwitch: jest.fn(),
      getSwitchValue: jest.fn(),
    },
  },
}));

jest.mock('../../logging', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('../../store', () => ({
  select: jest.fn(),
  safeSelect: jest.fn(),
}));

describe('stateCli', () => {
  const originalArgv = process.argv;

  beforeEach(() => {
    jest.clearAllMocks();
    (app.commandLine.hasSwitch as jest.Mock).mockReturnValue(false);
    (app.commandLine.getSwitchValue as jest.Mock).mockReturnValue('');
    process.argv = [...originalArgv];
  });

  afterAll(() => {
    process.argv = originalArgv;
  });

  describe('getCommandLineSwitch', () => {
    it('returns value from --switch=value format', () => {
      const result = getCommandLineSwitch('test-flag', [
        'node',
        'app',
        '--test-flag=my-value',
      ]);
      expect(result).toBe('my-value');
    });

    it('returns value from --switch value format', () => {
      const result = getCommandLineSwitch('test-flag', [
        'node',
        'app',
        '--test-flag',
        'my-value',
      ]);
      expect(result).toBe('my-value');
    });

    it('strips enclosing quotes from value', () => {
      expect(
        getCommandLineSwitch('test-flag', ['--test-flag="quoted/path"'])
      ).toBe('quoted/path');
      expect(
        getCommandLineSwitch('test-flag', ['--test-flag', "'single/quoted'"])
      ).toBe('single/quoted');
    });

    it('returns null when switch is not present', () => {
      const result = getCommandLineSwitch('missing', ['--other=123']);
      expect(result).toBeNull();
    });

    it('does not treat following flag as switch value in space-separated format', () => {
      const result = getCommandLineSwitch('test-flag', [
        '--test-flag',
        '--other-flag',
      ]);
      expect(result).toBeNull();
    });

    it('falls back to app.commandLine when switch not in argv array', () => {
      (app.commandLine.hasSwitch as jest.Mock).mockReturnValue(true);
      (app.commandLine.getSwitchValue as jest.Mock).mockReturnValue('from-app');

      const result = getCommandLineSwitch('test-flag', []);
      expect(result).toBe('from-app');
    });
  });

  describe('loadStateFromCli', () => {
    it('returns empty object when no state path is specified', async () => {
      const result = await loadStateFromCli();
      expect(result).toEqual({});
    });

    it('loads and parses state from specified file path', async () => {
      const mockState = {
        isMenuBarEnabled: false,
        servers: [{ url: 'https://open.rocket.chat' }],
      };
      jest
        .spyOn(fs.promises, 'readFile')
        .mockResolvedValueOnce(JSON.stringify(mockState));

      const result = await loadStateFromCli('fixtures/state.json');
      expect(result).toEqual(mockState);
      expect(fs.promises.readFile).toHaveBeenCalledWith(
        path.resolve(process.cwd(), 'fixtures/state.json'),
        'utf8'
      );
    });

    it('returns empty object on file read failure', async () => {
      jest
        .spyOn(fs.promises, 'readFile')
        .mockRejectedValueOnce(new Error('ENOENT'));

      const result = await loadStateFromCli('nonexistent.json');
      expect(result).toEqual({});
    });

    it('returns empty object on invalid JSON content', async () => {
      jest
        .spyOn(fs.promises, 'readFile')
        .mockResolvedValueOnce('{ invalid json');

      const result = await loadStateFromCli('corrupted.json');
      expect(result).toEqual({});
    });

    it('returns empty object when JSON is not an object (e.g. array)', async () => {
      jest
        .spyOn(fs.promises, 'readFile')
        .mockResolvedValueOnce(JSON.stringify(['array']));

      const result = await loadStateFromCli('array.json');
      expect(result).toEqual({});
    });
  });

  describe('exportStateToCli', () => {
    it('does nothing when no export path is specified', () => {
      const mkdirSpy = jest.spyOn(fs, 'mkdirSync').mockReturnValue(undefined);
      const writeSpy = jest
        .spyOn(fs, 'writeFileSync')
        .mockReturnValue(undefined);

      exportStateToCli();
      expect(mkdirSpy).not.toHaveBeenCalled();
      expect(writeSpy).not.toHaveBeenCalled();
    });

    it('exports persistable state to the specified path', () => {
      const mockState = { isMenuBarEnabled: true };
      (store.safeSelect as jest.Mock).mockReturnValue(mockState);

      const mkdirSpy = jest
        .spyOn(fs, 'mkdirSync')
        .mockReturnValue(undefined as any);
      const writeSpy = jest
        .spyOn(fs, 'writeFileSync')
        .mockReturnValue(undefined as any);
      const renameSpy = jest
        .spyOn(fs, 'renameSync')
        .mockReturnValue(undefined as any);

      exportStateToCli('export/state.json');

      const expectedPath = path.resolve(process.cwd(), 'export/state.json');
      const expectedTmpPath = `${expectedPath}.tmp`;
      expect(mkdirSpy).toHaveBeenCalledWith(path.dirname(expectedPath), {
        recursive: true,
      });
      expect(writeSpy).toHaveBeenCalledWith(
        expectedTmpPath,
        JSON.stringify(mockState, null, 2),
        'utf8'
      );
      expect(renameSpy).toHaveBeenCalledWith(expectedTmpPath, expectedPath);
    });

    it('handles write errors gracefully without throwing', () => {
      (store.safeSelect as jest.Mock).mockReturnValue({
        isMenuBarEnabled: true,
      });
      jest.spyOn(fs, 'mkdirSync').mockImplementationOnce(() => {
        throw new Error('EACCES');
      });

      expect(() => exportStateToCli('restricted/state.json')).not.toThrow();
    });
  });
});
