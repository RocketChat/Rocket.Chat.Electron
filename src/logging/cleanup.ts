import fs from 'fs';
import path from 'path';

import { app } from 'electron';

const DEFAULT_RETENTION_DAYS = 30;

/**
 * Clean up old log files based on retention policy
 * @param retentionDays - Number of days to keep logs (default 30)
 */
export const cleanupOldLogs = (
  retentionDays = DEFAULT_RETENTION_DAYS
): void => {
  try {
    if (!Number.isFinite(retentionDays) || retentionDays <= 0) {
      console.warn('[logging] Invalid retentionDays; skipping log cleanup');
      return;
    }

    const logsPath = app.getPath('logs');
    const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

    if (!fs.existsSync(logsPath)) return;

    const files = fs.readdirSync(logsPath);
    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(logsPath, file);
      try {
        const stats = fs.statSync(filePath);
        if (stats.isFile() && stats.mtime.getTime() < cutoffTime) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      } catch {
        // Skip files we can't access
      }
    }

    if (deletedCount > 0) {
      console.info(`[logging] Cleaned up ${deletedCount} old log file(s)`);
    }
  } catch (error) {
    console.warn('[logging] Failed to cleanup old logs:', error);
  }
};
