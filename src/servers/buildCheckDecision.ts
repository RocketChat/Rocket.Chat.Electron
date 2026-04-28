import type { Server } from './common';

export type BuildCheckDecision =
  | { kind: 'noop' }
  | { kind: 'adopt' }
  | { kind: 'clear'; reason: string };

export const decideBuildCheck = (
  server: Pick<
    Server,
    'lastServerBuildId' | 'lastCacheVersion' | 'gitCommitHash' | 'version'
  >,
  payload: {
    buildId?: string;
    cacheVersion?: string;
    buildIdSource?: 'commit' | 'version';
  }
): BuildCheckDecision => {
  const { buildId, cacheVersion, buildIdSource } = payload;

  // Nothing actionable from the server — caller should short-circuit, but guard here too.
  if (!buildId && !cacheVersion) return { kind: 'noop' };

  const hasNewBaseline =
    !!server.lastServerBuildId || !!server.lastCacheVersion;

  const incomingIsCommit = buildIdSource === 'commit' && !!buildId;
  const incomingIsVersion = buildIdSource === 'version' && !!buildId;

  // Legacy migration: no new-baseline fields recorded yet.
  if (!hasNewBaseline) {
    if (incomingIsCommit && !!server.gitCommitHash) {
      // Compare like-for-like: incoming commit vs stored commit.
      if (server.gitCommitHash === buildId) return { kind: 'adopt' };
      return {
        kind: 'clear',
        reason: `legacy gitCommitHash ${server.gitCommitHash} -> ${buildId}`,
      };
    }

    if (incomingIsVersion && !!server.version) {
      // Compare like-for-like: incoming version vs stored version.
      if (server.version === buildId) return { kind: 'adopt' };
      return {
        kind: 'clear',
        reason: `legacy version ${server.version} -> ${buildId}`,
      };
    }

    // Cross-source or no legacy baseline at all — first observation, adopt.
    return { kind: 'adopt' };
  }

  // New-baseline path: check for actual changes.
  const buildChanged =
    !!buildId &&
    !!server.lastServerBuildId &&
    server.lastServerBuildId !== buildId;
  const cacheVersionChanged =
    !!cacheVersion &&
    !!server.lastCacheVersion &&
    server.lastCacheVersion !== cacheVersion;

  if (buildChanged || cacheVersionChanged) {
    const reason = buildChanged
      ? `buildId ${server.lastServerBuildId} -> ${buildId}`
      : `cacheVersion ${server.lastCacheVersion} -> ${cacheVersion}`;
    return { kind: 'clear', reason };
  }

  // Partial baseline: new field arriving that wasn't stored yet — adopt patch.
  if (
    (buildId && !server.lastServerBuildId) ||
    (cacheVersion && !server.lastCacheVersion)
  ) {
    return { kind: 'adopt' };
  }

  // No change.
  return { kind: 'noop' };
};
