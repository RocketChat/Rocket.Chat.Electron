import { parse, gt, prerelease, SemVer } from 'semver';

export const getChannel = (version: SemVer): string => {
  const pre = prerelease(version);
  if (!pre || pre.length === 0) return 'stable';
  if (pre[0] === 'alpha') return 'alpha';
  if (pre[0] === 'beta') return 'beta';
  if (pre[0] === 'rc' || pre[0] === 'candidate') return 'candidate';
  return 'prerelease';
};

export const normalizeTag = (tag: string): string =>
  tag.startsWith('v') ? tag.slice(1) : tag;

export const getLatestTagForChannel = (
  tags: string[],
  channel: string
): SemVer | null => {
  const channelTags = tags
    .map((tag) => parse(tag))
    .filter((v): v is SemVer => v !== null)
    .filter((v) => getChannel(v) === channel)
    .sort((a, b) => (gt(a, b) ? -1 : 1));

  return channelTags[0] || null;
};

export type EvaluateTagInput = {
  version: SemVer;
  existingTags: string[];
  force?: boolean;
};

export type EvaluateTagResult = {
  ok: boolean;
  error?: string;
  warning?: string;
  latestInChannel: SemVer | null;
};

export const evaluateTag = ({
  version,
  existingTags,
  force = false,
}: EvaluateTagInput): EvaluateTagResult => {
  if (existingTags.includes(version.version)) {
    return {
      ok: false,
      error: `Tag ${version.version} already exists!`,
      latestInChannel: null,
    };
  }

  const channel = getChannel(version);
  const latestInChannel = getLatestTagForChannel(existingTags, channel);

  if (latestInChannel && !gt(version, latestInChannel)) {
    const message = `Version ${version.version} is not greater than the latest ${channel} release (${latestInChannel.version}).`;
    if (force) {
      return {
        ok: true,
        warning: message,
        latestInChannel,
      };
    }
    return {
      ok: false,
      error: message,
      latestInChannel,
    };
  }

  return { ok: true, latestInChannel };
};
