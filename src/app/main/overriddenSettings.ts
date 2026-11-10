import fs from 'fs';
import path from 'path';

import { app } from 'electron';

/**
 * An administrator can deploy `overridden-settings.json` in two places. A
 * value in the file next to the app bundle wins over the same value in the
 * user data folder.
 */
export const getUserDataOverriddenSettingsPath = (): string =>
  path.join(app.getPath('userData'), 'overridden-settings.json');

export const getAppOverriddenSettingsPath = (): string =>
  path.join(
    app.getAppPath(),
    app.getAppPath().endsWith('app.asar') ? '..' : '.',
    'overridden-settings.json'
  );

const parseOverriddenSettings = (content: string): Record<string, unknown> => {
  const json = JSON.parse(content);
  return json && typeof json === 'object' && !Array.isArray(json) ? json : {};
};

const readOverriddenSettingsFileSync = (
  getFilePath: () => string
): Record<string, unknown> => {
  try {
    return parseOverriddenSettings(fs.readFileSync(getFilePath(), 'utf8'));
  } catch {
    return {};
  }
};

/**
 * Reads the merged administrator overrides synchronously, for the settings
 * that Chromium needs before the app is ready (hardware acceleration), when
 * the store has not loaded the overrides yet.
 */
export const readOverriddenSettingsSync = (): Record<string, unknown> => ({
  ...readOverriddenSettingsFileSync(getUserDataOverriddenSettingsPath),
  ...readOverriddenSettingsFileSync(getAppOverriddenSettingsPath),
});
