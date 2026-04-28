import { coerce } from 'semver';

/**
 * Synthesized client-side timestamp marker emitted when Meteor's Autoupdate
 * signals a new client bundle but the private store can't yield a concrete
 * version. Distinct from the `buildIdSource: 'autoupdate'` enum value.
 * Pattern: `autoupdate-<Date.now()>`.
 */
export const SENTINEL_PREFIX = 'autoupdate-';

/**
 * Sentinel pattern: `autoupdate-` followed by 10+ digits (timestamp).
 * Date.now() produces 13-digit values; allow 10+ for future-proofing.
 * Anything not matching this exact pattern is treated as a concrete buildId.
 */
const isSentinel = (v: string | undefined): boolean => {
  if (typeof v !== 'string') return false;
  return /^autoupdate-\d{10,}$/.test(v);
};

import type { Server } from './common';

/**
 * Compare two version strings using semver coercion so that formatting
 * differences (e.g. leading 'v', extra whitespace) for the same release are
 * treated as equal and do not trigger a false cache-clear.
 * Pre-release versions (containing '-') are compared with strict string
 * equality so that RC bumps (7.5.0-rc.1 → 7.5.0-rc.2) and RC→GA promotions
 * (7.5.0-rc.1 → 7.5.0) always trigger a clear.
 * Commit hashes and bundle identifiers are NOT compared via this helper —
 * those are opaque strings where string equality is correct.
 */
const sameVersion = (a: string | undefined, b: string | undefined): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.includes('-') || b.includes('-')) return false;
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

    // Sentinel-aware comparison: synthetic IDs (Date.now() based) must not
    // bounce against each other or against an existing concrete baseline.
    // The page context that synthesizes sentinels is torn down on reload, so
    // consecutive sentinels differ (new Date.now()), but they represent the
    // same true-edge event — not a real bundle change.
    const incomingSentinel = isSentinel(buildId);
    const persistedSentinel = isSentinel(server.lastBundleVersion);

    // Both synthetic — same true-edge story across renderer reloads. Noop.
    if (incomingSentinel && persistedSentinel) return { kind: 'noop' };

    // Incoming synthetic, persisted concrete — concrete is more authoritative.
    // Don't downgrade baseline. Noop.
    if (incomingSentinel && !persistedSentinel) return { kind: 'noop' };

    // Incoming concrete, persisted synthetic — first real observation after
    // edge-trigger. Clear and adopt the concrete version.
    if (!incomingSentinel && persistedSentinel) {
      return {
        kind: 'clear',
        reason: `bundleVersion sentinel -> concrete ${buildId}`,
      };
    }

    // Both concrete and different — real bundle change.
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
