import type { Download } from '../downloads/common';

export type DownloadDayGroup = {
  /** Stable key for the day, from the start of the download. */
  day: string;
  items: Download[];
};

/**
 * Groups downloads into runs sharing a calendar day, preserving the order they
 * arrive in (newest first). Downloads without a usable `startTime` fall into an
 * "unknown" run rather than being dropped or dated to the epoch.
 */
export const groupDownloadsByDay = (
  downloads: Download[]
): DownloadDayGroup[] => {
  const groups: DownloadDayGroup[] = [];

  downloads.forEach((download) => {
    const started = new Date(download.startTime);
    const day = isNaN(started.getTime()) ? '' : started.toDateString();
    const current = groups[groups.length - 1];

    if (current && current.day === day) {
      current.items.push(download);
      return;
    }

    groups.push({ day, items: [download] });
  });

  return groups;
};

/** `Today` / `Yesterday` where they apply, otherwise a full date. */
export const formatDayLabel = (
  day: string,
  now: Date,
  labels: { today: string; yesterday: string; unknown: string }
): string => {
  if (!day) return labels.unknown;

  const parsed = new Date(day);
  if (isNaN(parsed.getTime())) return day;

  if (parsed.toDateString() === now.toDateString()) return labels.today;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (parsed.toDateString() === yesterday.toDateString()) {
    return labels.yesterday;
  }

  return parsed.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};
