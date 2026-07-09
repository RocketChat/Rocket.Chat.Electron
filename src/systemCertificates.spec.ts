import type { readFileSync as readFileSyncType } from 'fs';
import path from 'path';

import type * as SystemCertificatesModule from './systemCertificates';

const mockGetCACertificates = jest.fn();
const mockSetDefaultCACertificates = jest.fn();

const mockAppGetPath = jest.fn();
const mockAppGetAppPath = jest.fn();
const mockLoggerInfo = jest.fn();
const mockLoggerError = jest.fn();

jest.mock('electron', () => ({
  app: {
    getPath: (...args: [string]) => mockAppGetPath(...args),
    getAppPath: () => mockAppGetAppPath(),
  },
}));

jest.mock('fs', () => ({
  readFileSync: jest.fn(),
}));

jest.mock('node:tls', () => ({
  __esModule: true,
  default: {
    getCACertificates: (...args: any[]) => mockGetCACertificates(...args),
    setDefaultCACertificates: (...args: any[]) =>
      mockSetDefaultCACertificates(...args),
  },
}));

jest.mock('./logging', () => ({
  logger: {
    info: (...args: any[]) => mockLoggerInfo(...args),
    error: (...args: any[]) => mockLoggerError(...args),
  },
}));

const { readFileSync } = jest.requireMock<{
  readFileSync: typeof readFileSyncType;
}>('fs');

const loadSystemCertificates = (): typeof SystemCertificatesModule => {
  let moduleExports: typeof SystemCertificatesModule;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    moduleExports = require('./systemCertificates');
  });
  return moduleExports!;
};

describe('systemCertificates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAppGetPath.mockReturnValue('/user/data');
    mockAppGetAppPath.mockReturnValue('/app');
    mockGetCACertificates.mockReset();
    mockSetDefaultCACertificates.mockReset();
  });

  it('respects explicit disable flags from overridden settings', () => {
    (readFileSync as jest.Mock).mockReturnValue(
      '{"useSystemCertificates":false}'
    );

    const { applySystemCertificates, getSystemCertificateStatus } =
      loadSystemCertificates();
    applySystemCertificates();

    expect(mockLoggerInfo).toHaveBeenCalledWith(
      'System CA certificates: disabled by overridden-settings.json'
    );
    expect(mockGetCACertificates).not.toHaveBeenCalled();
    expect(mockSetDefaultCACertificates).not.toHaveBeenCalled();
    expect(getSystemCertificateStatus()).toEqual({
      applied: false,
      certCount: 0,
    });
  });

  it('skips applying certificates when OS CA store is empty', () => {
    (readFileSync as jest.Mock).mockReturnValue(
      '{"useSystemCertificates":true}'
    );
    mockGetCACertificates.mockImplementation((scope?: string) => {
      if (scope === 'system') {
        return [];
      }
      return ['bundled'];
    });

    const { applySystemCertificates, getSystemCertificateStatus } =
      loadSystemCertificates();
    applySystemCertificates();

    expect(mockLoggerInfo).toHaveBeenCalledWith(
      'System CA certificates: none found in OS trust store, using bundled CAs only'
    );
    expect(mockGetCACertificates).toHaveBeenCalledWith('system');
    expect(getSystemCertificateStatus()).toEqual({
      applied: false,
      certCount: 0,
    });
  });

  it('applies system certificates when available and updates status', () => {
    (readFileSync as jest.Mock).mockReturnValue('{}');
    mockGetCACertificates.mockImplementation((scope?: string) =>
      scope === 'system' ? ['sys1', 'sys2'] : ['bundled']
    );

    const { applySystemCertificates, getSystemCertificateStatus } =
      loadSystemCertificates();
    applySystemCertificates();

    expect(mockSetDefaultCACertificates).toHaveBeenCalledWith([
      'bundled',
      'sys1',
      'sys2',
    ]);
    expect(mockLoggerInfo).toHaveBeenCalledWith(
      'System CA certificates: loaded 2 certificates from OS trust store'
    );
    expect(getSystemCertificateStatus()).toEqual({
      applied: true,
      certCount: 2,
    });
  });

  it('records errors and updates status when application fails', () => {
    (readFileSync as jest.Mock).mockReturnValue('{}');
    mockGetCACertificates.mockImplementation(() => {
      throw new Error('bad cert store');
    });

    const { applySystemCertificates, getSystemCertificateStatus } =
      loadSystemCertificates();
    applySystemCertificates();

    const status = getSystemCertificateStatus();
    expect(status.applied).toBe(false);
    expect(status.certCount).toBe(0);
    expect(status.error).toBe('bad cert store');
    expect(mockLoggerError).toHaveBeenCalledWith(
      'System CA certificates: failed to load —',
      'bad cert store'
    );
  });

  it('records non-error failures when application fails', () => {
    (readFileSync as jest.Mock).mockReturnValue('{}');
    mockGetCACertificates.mockImplementation(() => {
      // eslint-disable-next-line no-throw-literal -- verifies non-Error throw handling
      throw 'network failure';
    });

    const { applySystemCertificates, getSystemCertificateStatus } =
      loadSystemCertificates();
    applySystemCertificates();

    const status = getSystemCertificateStatus();
    expect(status.applied).toBe(false);
    expect(status.certCount).toBe(0);
    expect(status.error).toBe('network failure');
    expect(mockLoggerError).toHaveBeenCalledWith(
      'System CA certificates: failed to load —',
      'network failure'
    );
  });

  it('treats explicit string false as disabled', () => {
    (readFileSync as jest.Mock).mockReturnValue(
      '{"useSystemCertificates":"false"}'
    );

    const { applySystemCertificates, getSystemCertificateStatus } =
      loadSystemCertificates();
    applySystemCertificates();

    expect(mockLoggerInfo).toHaveBeenCalledWith(
      'System CA certificates: disabled by overridden-settings.json'
    );
    expect(mockGetCACertificates).not.toHaveBeenCalled();
    expect(getSystemCertificateStatus()).toEqual({
      applied: false,
      certCount: 0,
    });
  });

  it('ignores unparsable setting files and continues with defaults', () => {
    (readFileSync as jest.Mock).mockImplementation((pathToRead: string) => {
      if (pathToRead.includes('overridden-settings.json')) {
        return 'not-json';
      }
      return '{}';
    });

    mockGetCACertificates.mockImplementation((scope?: string) => {
      return scope === 'system' ? [] : ['bundled'];
    });

    const { applySystemCertificates, getSystemCertificateStatus } =
      loadSystemCertificates();
    applySystemCertificates();

    expect(mockLoggerInfo).toHaveBeenCalledWith(
      'System CA certificates: none found in OS trust store, using bundled CAs only'
    );
    expect(getSystemCertificateStatus()).toEqual({
      applied: false,
      certCount: 0,
    });
  });

  it('falls back to packaged app path when the first setting file is missing', () => {
    (readFileSync as jest.Mock).mockImplementation((pathToRead: string) => {
      if (pathToRead.includes('user/data')) {
        throw new Error('missing user setting');
      }
      return '{"useSystemCertificates":false}';
    });
    mockGetCACertificates.mockReturnValue(['bundled']);

    const { applySystemCertificates, getSystemCertificateStatus } =
      loadSystemCertificates();
    applySystemCertificates();

    expect(mockLoggerInfo).toHaveBeenCalledWith(
      'System CA certificates: disabled by overridden-settings.json'
    );
    expect(mockGetCACertificates).not.toHaveBeenCalled();
    expect(getSystemCertificateStatus()).toEqual({
      applied: false,
      certCount: 0,
    });
  });

  it('uses asar app path when building app-level override path', () => {
    mockAppGetAppPath.mockReturnValue('/tmp/desktop/app.asar');
    (readFileSync as jest.Mock).mockImplementation((pathToRead: string) => {
      if (pathToRead.includes('user/data')) {
        return '{}';
      }

      if (
        pathToRead ===
        path.join('/tmp/desktop/app.asar', '..', 'overridden-settings.json')
      ) {
        return '{"useSystemCertificates":false}';
      }

      return '{}';
    });
    mockGetCACertificates.mockReturnValue(['bundled']);

    const { applySystemCertificates, getSystemCertificateStatus } =
      loadSystemCertificates();
    applySystemCertificates();

    expect(mockLoggerInfo).toHaveBeenCalledWith(
      'System CA certificates: disabled by overridden-settings.json'
    );
    expect(readFileSync).toHaveBeenCalledWith(
      path.join('/tmp/desktop/app.asar', '..', 'overridden-settings.json'),
      'utf8'
    );
    expect(getSystemCertificateStatus()).toEqual({
      applied: false,
      certCount: 0,
    });
  });
});
