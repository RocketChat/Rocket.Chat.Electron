import fs from 'fs';
import path from 'path';

import { app } from 'electron';

import type { GpuFallbackMode } from '../app/PersistableValues';

export const readSetting = (key: string) => {
  try {
    const filePath = path.join(app.getPath('userData'), 'config.json');
    const content = fs.readFileSync(filePath, 'utf8');
    const json = JSON.parse(content);

    return json[key];
  } catch (e) {
    return null;
  }
};

export const readGpuFallbackMode = (): GpuFallbackMode => {
  const value = readSetting('gpuFallbackMode');
  if (value === 'x11' || value === 'disabled') {
    return value;
  }
  return 'none';
};

export const saveGpuFallbackMode = (mode: GpuFallbackMode): void => {
  try {
    const filePath = path.join(app.getPath('userData'), 'config.json');
    let json: Record<string, unknown> = {};

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      json = JSON.parse(content);
    } catch {
      // File doesn't exist or is invalid, start fresh
    }

    json.gpuFallbackMode = mode;
    fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to save GPU fallback mode:', error);
  }
};
