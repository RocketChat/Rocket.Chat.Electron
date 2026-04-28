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
  it('records lastServerBuildId and lastCacheVersion on first observation', () => {
    const state = [{ ...baseServer }];
    const next = servers(state, {
      type: WEBVIEW_SERVER_BUILD_UPDATED,
      payload: {
        url: baseServer.url,
        buildId: 'abc123',
        cacheVersion: 'v2',
      },
    });
    const updated = next.find((s) => s.url === baseServer.url)!;
    expect(updated.lastServerBuildId).toBe('abc123');
    expect(updated.lastCacheVersion).toBe('v2');
  });

  it('sets gitCommitHash to buildId when buildId is present (Issue 2 fix)', () => {
    const state = [{ ...baseServer, gitCommitHash: 'old-hash' }];
    const next = servers(state, {
      type: WEBVIEW_SERVER_BUILD_UPDATED,
      payload: {
        url: baseServer.url,
        buildId: 'new-hash',
        cacheVersion: undefined,
      },
    });
    const updated = next.find((s) => s.url === baseServer.url)!;
    expect(updated.gitCommitHash).toBe('new-hash');
    expect(updated.lastServerBuildId).toBe('new-hash');
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
