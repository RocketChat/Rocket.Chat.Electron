import { coerce } from 'semver';

import type { Server } from './common';

/**
 * Compare two version strings using semver coercion so that pre-release
 * variants of the same release (e.g. '7.5.0' vs '7.5.0-rc.1') are treated as
 * equal and do not trigger a false cache-clear.
 * Commit hashes and bundle identifiers are NOT compared via this helper —
 * those are opaque strings where string equality is correct.
 */
const sameVersion = (a: string | undefined, b: string | undefined): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  const ca = coerce(a)?.version;
  const cb = coerce(b)?.version;
  return !!ca && !!cb && ca === cb;
};

export type BuildCheckDecision =
  | { kind: 'noop' }
  | { kind: 'adopt' }
  | { kind: 'clear'; reason: string };

export const decideBuildCheck = (
  server: Pick<
    Server,
    | 'lastCommitBuildId'
    | 'lastVersionBuildId'
    | 'lastBundleVersion'
    | 'lastCacheVersion'
    | 'gitCommitHash'
    | 'version'
  >,
  payload: {
    buildId?: string;
    cacheVersion?: string;
    buildIdSource?: 'commit' | 'version' | 'autoupdate';
  }
): BuildCheckDecision => {
  const { buildId, cacheVersion, buildIdSource } = payload;

  // Nothing actionable from the server — caller should short-circuit, but guard here too.
  if (!buildId && !cacheVersion) return { kind: 'noop' };

  // cacheVersion mismatch is an independent bundle-change signal regardless of which
  // source path runs. Check it once here before any source-specific logic.
  if (
    cacheVersion !== undefined &&
    server.lastCacheVersion !== undefined &&
    server.lastCacheVersion !== cacheVersion
  ) {
    return {
      kind: 'clear',
      reason: `cacheVersion ${server.lastCacheVersion} -> ${cacheVersion}`,
    };
  }

  // --- autoupdate source: operates on lastBundleVersion only ---
  if (buildIdSource === 'autoupdate') {
    if (!buildId) return { kind: 'noop' };
    if (!server.lastBundleVersion) {
      return { kind: 'adopt' };
    }
    if (server.lastBundleVersion === buildId) return { kind: 'noop' };
    return {
      kind: 'clear',
      reason: `bundleVersion ${server.lastBundleVersion} -> ${buildId}`,
    };
  }

  // --- commit source: operates on lastCommitBuildId ---
  if (buildIdSource === 'commit' && buildId) {
    if (!server.lastCommitBuildId) {
      // No commit baseline yet — check legacy gitCommitHash migration.
      if (server.gitCommitHash) {
        if (server.gitCommitHash === buildId) return { kind: 'adopt' };
        return {
          kind: 'clear',
          reason: `legacy gitCommitHash ${server.gitCommitHash} -> ${buildId}`,
        };
      }
      // First observation, adopt.
      return { kind: 'adopt' };
    }
    if (server.lastCommitBuildId === buildId) {
      // buildId matches; cacheVersion mismatch already handled above.
      if (cacheVersion && !server.lastCacheVersion) return { kind: 'adopt' };
      return { kind: 'noop' };
    }
    return {
      kind: 'clear',
      reason: `commitBuildId ${server.lastCommitBuildId} -> ${buildId}`,
    };
  }

  // --- version source: operates on lastVersionBuildId ---
  if (buildIdSource === 'version' && buildId) {
    if (!server.lastVersionBuildId) {
      // No version baseline yet — check legacy server.version migration.
      if (server.version) {
        if (sameVersion(server.version, buildId)) return { kind: 'adopt' };
        return {
          kind: 'clear',
          reason: `legacy version ${server.version} -> ${buildId}`,
        };
      }
      // First observation, adopt.
      return { kind: 'adopt' };
    }
    if (sameVersion(server.lastVersionBuildId, buildId)) {
      // buildId matches; cacheVersion mismatch already handled above.
      if (cacheVersion && !server.lastCacheVersion) return { kind: 'adopt' };
      return { kind: 'noop' };
    }
    return {
      kind: 'clear',
      reason: `versionBuildId ${server.lastVersionBuildId} -> ${buildId}`,
    };
  }

  // --- source undefined: only cacheVersion can arrive here (buildId without source) ---
  // Treat as adopt/noop based solely on cacheVersion; do not write commit or version baseline.
  if (cacheVersion) {
    if (!server.lastCacheVersion) return { kind: 'adopt' };
    if (server.lastCacheVersion === cacheVersion) return { kind: 'noop' };
    return {
      kind: 'clear',
      reason: `cacheVersion ${server.lastCacheVersion} -> ${cacheVersion}`,
    };
  }

  // buildId present but source unknown — first observation, adopt.
  return { kind: 'adopt' };
};
