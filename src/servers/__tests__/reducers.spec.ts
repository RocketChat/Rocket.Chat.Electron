import {
  WEBVIEW_GIT_COMMIT_HASH_CHANGED,
  WEBVIEW_SERVER_BUILD_UPDATED,
} from '../../ui/actions';
import type { Server } from '../common';
import { servers } from '../reducers';

const baseServer: Server = {
  url: 'https://example.rocket.chat/',
  title: 'Test',
};

describe('servers reducer — WEBVIEW_SERVER_BUILD_UPDATED', () => {
  it('records lastCacheVersion on first observation (no source)', () => {
    const state = [{ ...baseServer }];
    const next = servers(state, {
      type: WEBVIEW_SERVER_BUILD_UPDATED,
      payload: {
        url: baseServer.url,
        buildId: undefined,
        cacheVersion: 'v2',
      },
    });
    const updated = next.find((s) => s.url === baseServer.url)!;
    expect(updated.lastCacheVersion).toBe('v2');
  });

  it('writes lastCommitBuildId and mirrors to gitCommitHash when buildIdSource is commit', () => {
    const state = [{ ...baseServer, gitCommitHash: 'old-hash' }];
    const next = servers(state, {
      type: WEBVIEW_SERVER_BUILD_UPDATED,
      payload: {
        url: baseServer.url,
        buildId: 'new-hash',
        cacheVersion: undefined,
        buildIdSource: 'commit',
      },
    });
    const updated = next.find((s) => s.url === baseServer.url)!;
    expect(updated.lastCommitBuildId).toBe('new-hash');
    expect(updated.gitCommitHash).toBe('new-hash');
    // Must NOT touch version baseline
    expect(updated.lastVersionBuildId).toBeUndefined();
  });

  it('writes lastVersionBuildId and does NOT touch gitCommitHash when buildIdSource is version', () => {
    const state = [{ ...baseServer, gitCommitHash: 'real-hash-abc' }];
    const next = servers(state, {
      type: WEBVIEW_SERVER_BUILD_UPDATED,
      payload: {
        url: baseServer.url,
        buildId: '7.5.0',
        cacheVersion: undefined,
        buildIdSource: 'version',
      },
    });
    const updated = next.find((s) => s.url === baseServer.url)!;
    expect(updated.lastVersionBuildId).toBe('7.5.0');
    // gitCommitHash must NOT be overwritten by the version string
    expect(updated.gitCommitHash).toBe('real-hash-abc');
    // Must NOT touch commit baseline
    expect(updated.lastCommitBuildId).toBeUndefined();
  });

  it('does NOT write commit or version baseline when buildIdSource is absent', () => {
    const state = [{ ...baseServer, gitCommitHash: 'real-hash-xyz' }];
    const next = servers(state, {
      type: WEBVIEW_SERVER_BUILD_UPDATED,
      payload: {
        url: baseServer.url,
        buildId: 'some-id',
        cacheVersion: undefined,
        buildIdSource: undefined,
      },
    });
    const updated = next.find((s) => s.url === baseServer.url)!;
    expect(updated.gitCommitHash).toBe('real-hash-xyz');
    expect(updated.lastCommitBuildId).toBeUndefined();
    expect(updated.lastVersionBuildId).toBeUndefined();
  });

  it('does not set gitCommitHash when buildId is absent', () => {
    const state = [
      { ...baseServer, gitCommitHash: 'old-hash', lastCacheVersion: 'v1' },
    ];
    const next = servers(state, {
      type: WEBVIEW_SERVER_BUILD_UPDATED,
      payload: {
        url: baseServer.url,
        buildId: undefined,
        cacheVersion: 'v2',
      },
    });
    const updated = next.find((s) => s.url === baseServer.url)!;
    expect(updated.gitCommitHash).toBe('old-hash');
    expect(updated.lastCacheVersion).toBe('v2');
  });

  it('returns state unchanged for unknown url', () => {
    const state = [{ ...baseServer }];
    const next = servers(state, {
      type: WEBVIEW_SERVER_BUILD_UPDATED,
      payload: {
        url: 'https://other.example.com/',
        buildId: 'abc',
        cacheVersion: undefined,
      },
    });
    expect(next).toBe(state);
  });
});

describe('servers reducer — WEBVIEW_SERVER_BUILD_UPDATED autoupdate source', () => {
  it('writes lastBundleVersion (not lastCommitBuildId, not lastVersionBuildId, not gitCommitHash) when buildIdSource is autoupdate', () => {
    const state = [{ ...baseServer, gitCommitHash: 'real-hash', lastCommitBuildId: 'commit-id' }];
    const next = servers(state, {
      type: WEBVIEW_SERVER_BUILD_UPDATED,
      payload: {
        url: baseServer.url,
        buildId: 'bundle-abc',
        cacheVersion: undefined,
        buildIdSource: 'autoupdate',
      },
    });
    const updated = next.find((s) => s.url === baseServer.url)!;
    expect(updated.lastBundleVersion).toBe('bundle-abc');
    // lastCommitBuildId must remain unchanged
    expect(updated.lastCommitBuildId).toBe('commit-id');
    // gitCommitHash must remain unchanged
    expect(updated.gitCommitHash).toBe('real-hash');
    // version baseline untouched
    expect(updated.lastVersionBuildId).toBeUndefined();
  });
});

describe('servers reducer — WEBVIEW_GIT_COMMIT_HASH_CHANGED', () => {
  it('updates gitCommitHash', () => {
    const state = [{ ...baseServer, gitCommitHash: 'old' }];
    const next = servers(state, {
      type: WEBVIEW_GIT_COMMIT_HASH_CHANGED,
      payload: { url: baseServer.url, gitCommitHash: 'new' },
    });
    const updated = next.find((s) => s.url === baseServer.url)!;
    expect(updated.gitCommitHash).toBe('new');
  });
});
