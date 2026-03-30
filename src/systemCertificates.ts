import fs from 'fs';
import tls from 'node:tls';
import path from 'path';

import { app } from 'electron';

import { logger } from './logging';

type SystemCertificateStatus = {
  applied: boolean;
  certCount: number;
  error?: string;
};

let status: SystemCertificateStatus = { applied: false, certCount: 0 };

const readUseSystemCertificatesSetting = (): boolean => {
  const locations = [
    path.join(app.getPath('userData'), 'overridden-settings.json'),
    path.join(
      app.getAppPath(),
      app.getAppPath().endsWith('app.asar') ? '..' : '.',
      'overridden-settings.json'
    ),
  ];

  for (const filePath of locations) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const json = JSON.parse(content);
      if (json && typeof json === 'object' && 'useSystemCertificates' in json) {
        return (
          json.useSystemCertificates !== false &&
          String(json.useSystemCertificates).toLowerCase() !== 'false'
        );
      }
    } catch {
      // File doesn't exist or is invalid — continue to next location
    }
  }

  return true;
};

export const applySystemCertificates = (): void => {
  try {
    const enabled = readUseSystemCertificatesSetting();
    if (!enabled) {
      logger.info(
        'System CA certificates: disabled by overridden-settings.json'
      );
      return;
    }

    const systemCerts = tls.getCACertificates('system');

    if (!systemCerts || systemCerts.length === 0) {
      logger.info(
        'System CA certificates: none found in OS trust store, using bundled CAs only'
      );
      return;
    }

    const bundledCerts = tls.getCACertificates('bundled');
    tls.setDefaultCACertificates([...systemCerts, ...bundledCerts]);

    status = { applied: true, certCount: systemCerts.length };
    logger.info(
      `System CA certificates: loaded ${systemCerts.length} certificates from OS trust store`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('System CA certificates: failed to load —', message);
    status = { applied: false, certCount: 0, error: message };
  }
};

export const getSystemCertificateStatus = (): SystemCertificateStatus => status;
