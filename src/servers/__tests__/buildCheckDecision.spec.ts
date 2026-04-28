import { decideBuildCheck } from '../buildCheckDecision';

const noBaseline = {
  lastCommitBuildId: undefined,
  lastVersionBuildId: undefined,
  lastBundleVersion: undefined,
  lastCacheVersion: undefined,
  gitCommitHash: undefined,
  version: undefined,
};

describe('decideBuildCheck', () => {
  describe('noop guard', () => {
    it('returns noop when both buildId and cacheVersion are absent', () => {
      expect(
        decideBuildCheck(noBaseline, { buildId: undefined, cacheVersion: undefined })
      ).toEqual({ kind: 'noop' });
    });
  });

  describe('first observation (no baseline anywhere)', () => {
    it('adopts when no legacy or new baseline exists (commit source)', () => {
      expect(
        decideBuildCheck(noBaseline, {
          buildId: 'abc123',
          buildIdSource: 'commit',
        })
      ).toEqual({ kind: 'adopt' });
    });

    it('adopts when no legacy or new baseline exists (version source)', () => {
      expect(
        decideBuildCheck(noBaseline, {
          buildId: '7.5.0',
          buildIdSource: 'version',
        })
      ).toEqual({ kind: 'adopt' });
    });

    it('adopts when only cacheVersion arrives with no baseline', () => {
      expect(
        decideBuildCheck(noBaseline, { cacheVersion: '3' })
      ).toEqual({ kind: 'adopt' });
    });
  });

  describe('legacy gitCommitHash migration', () => {
    const serverWithCommit = {
      ...noBaseline,
      gitCommitHash: 'deadbeef',
    };

    it('adopts when legacy commit matches incoming commit-source buildId', () => {
      expect(
        decideBuildCheck(serverWithCommit, {
          buildId: 'deadbeef',
          buildIdSource: 'commit',
        })
      ).toEqual({ kind: 'adopt' });
    });

    it('clears when legacy commit differs from incoming commit-source buildId', () => {
      const result = decideBuildCheck(serverWithCommit, {
        buildId: 'cafebabe',
        buildIdSource: 'commit',
      });
      expect(result.kind).toBe('clear');
      expect((result as { kind: 'clear'; reason: string }).reason).toContain(
        'deadbeef'
      );
      expect((result as { kind: 'clear'; reason: string }).reason).toContain(
        'cafebabe'
      );
    });

    it('adopts (not clears) when legacy commit present but incoming is version-source', () => {
      // Cross-source — version source has no lastVersionBuildId and no server.version, adopt.
      expect(
        decideBuildCheck(serverWithCommit, {
          buildId: '7.5.0',
          buildIdSource: 'version',
        })
      ).toEqual({ kind: 'adopt' });
    });
  });

  describe('legacy version migration', () => {
    const serverWithVersion = {
      ...noBaseline,
      version: '7.4.0',
    };

    it('adopts when legacy version matches incoming version-source buildId', () => {
      expect(
        decideBuildCheck(serverWithVersion, {
          buildId: '7.4.0',
          buildIdSource: 'version',
        })
      ).toEqual({ kind: 'adopt' });
    });

    it('clears when legacy version differs from incoming version-source buildId', () => {
      const result = decideBuildCheck(serverWithVersion, {
        buildId: '7.5.0',
        buildIdSource: 'version',
      });
      expect(result.kind).toBe('clear');
      expect((result as { kind: 'clear'; reason: string }).reason).toContain(
        '7.4.0'
      );
      expect((result as { kind: 'clear'; reason: string }).reason).toContain(
        '7.5.0'
      );
    });

    it('adopts (not clears) when legacy version present but incoming is commit-source', () => {
      // Cross-source — commit source has no lastCommitBuildId and no gitCommitHash, adopt.
      expect(
        decideBuildCheck(serverWithVersion, {
          buildId: 'abc123',
          buildIdSource: 'commit',
        })
      ).toEqual({ kind: 'adopt' });
    });
  });

  describe('new baseline — commit source', () => {
    it('clears when lastCommitBuildId differs from incoming commit-source buildId', () => {
      const result = decideBuildCheck(
        { ...noBaseline, lastCommitBuildId: 'old-commit', lastCacheVersion: '2' },
        { buildId: 'new-commit', cacheVersion: '2', buildIdSource: 'commit' }
      );
      expect(result.kind).toBe('clear');
      expect((result as { kind: 'clear'; reason: string }).reason).toContain(
        'old-commit'
      );
    });

    it('returns noop when lastCommitBuildId matches incoming', () => {
      expect(
        decideBuildCheck(
          { ...noBaseline, lastCommitBuildId: 'abc', lastCacheVersion: '2' },
          { buildId: 'abc', cacheVersion: '2', buildIdSource: 'commit' }
        )
      ).toEqual({ kind: 'noop' });
    });

    it('adopts when buildId arrives but commit baseline was not previously stored', () => {
      expect(
        decideBuildCheck(
          { ...noBaseline, lastCommitBuildId: undefined, lastCacheVersion: '1' },
          { buildId: 'abc', cacheVersion: '1', buildIdSource: 'commit' }
        )
      ).toEqual({ kind: 'adopt' });
    });
  });

  describe('new baseline — version source', () => {
    it('clears when lastVersionBuildId differs from incoming version-source buildId', () => {
      const result = decideBuildCheck(
        { ...noBaseline, lastVersionBuildId: '7.4.0', lastCacheVersion: '2' },
        { buildId: '7.5.0', cacheVersion: '2', buildIdSource: 'version' }
      );
      expect(result.kind).toBe('clear');
      expect((result as { kind: 'clear'; reason: string }).reason).toContain(
        '7.4.0'
      );
    });

    it('returns noop when lastVersionBuildId matches incoming', () => {
      expect(
        decideBuildCheck(
          { ...noBaseline, lastVersionBuildId: '7.5.0', lastCacheVersion: '2' },
          { buildId: '7.5.0', cacheVersion: '2', buildIdSource: 'version' }
        )
      ).toEqual({ kind: 'noop' });
    });

    it('adopts when buildId arrives but version baseline was not previously stored', () => {
      expect(
        decideBuildCheck(
          { ...noBaseline, lastVersionBuildId: undefined, lastCacheVersion: '1' },
          { buildId: '7.5.0', cacheVersion: '1', buildIdSource: 'version' }
        )
      ).toEqual({ kind: 'adopt' });
    });
  });

  describe('cross-source isolation (core bug fix)', () => {
    it('version baseline + incoming commit (different value) → adopt, not clear', () => {
      // Server previously seen via version source. Now commit hash arrives.
      // Must NOT trigger a clear — these are independent baselines.
      expect(
        decideBuildCheck(
          { ...noBaseline, lastVersionBuildId: '7.5.0' },
          { buildId: 'deadbeef', buildIdSource: 'commit' }
        )
      ).toEqual({ kind: 'adopt' });
    });

    it('commit baseline + incoming version (different value) → adopt, not clear', () => {
      // Server previously seen via commit source. Now version string arrives.
      // Must NOT trigger a clear.
      expect(
        decideBuildCheck(
          { ...noBaseline, lastCommitBuildId: 'deadbeef' },
          { buildId: '7.5.0', buildIdSource: 'version' }
        )
      ).toEqual({ kind: 'adopt' });
    });

    it('version baseline + incoming version (different value) → clear', () => {
      // Same-source mismatch: version changed, should clear.
      const result = decideBuildCheck(
        { ...noBaseline, lastVersionBuildId: '7.4.0' },
        { buildId: '7.5.0', buildIdSource: 'version' }
      );
      expect(result.kind).toBe('clear');
      expect((result as { kind: 'clear'; reason: string }).reason).toContain('7.4.0');
      expect((result as { kind: 'clear'; reason: string }).reason).toContain('7.5.0');
    });

    it('commit baseline + incoming commit (different value) → clear', () => {
      // Same-source mismatch: commit changed, should clear.
      const result = decideBuildCheck(
        { ...noBaseline, lastCommitBuildId: 'oldbeef' },
        { buildId: 'newbeef', buildIdSource: 'commit' }
      );
      expect(result.kind).toBe('clear');
      expect((result as { kind: 'clear'; reason: string }).reason).toContain('oldbeef');
      expect((result as { kind: 'clear'; reason: string }).reason).toContain('newbeef');
    });

    it('both baselines populated — only same-source mismatch triggers clear', () => {
      // lastVersionBuildId and lastCommitBuildId both set. Incoming version differs.
      // commit baseline is untouched, version baseline triggers the clear.
      const result = decideBuildCheck(
        { ...noBaseline, lastCommitBuildId: 'deadbeef', lastVersionBuildId: '7.4.0' },
        { buildId: '7.5.0', buildIdSource: 'version' }
      );
      expect(result.kind).toBe('clear');
      expect((result as { kind: 'clear'; reason: string }).reason).toContain('7.4.0');
    });

    it('both baselines populated — incoming commit matches → noop', () => {
      expect(
        decideBuildCheck(
          { ...noBaseline, lastCommitBuildId: 'deadbeef', lastVersionBuildId: '7.4.0' },
          { buildId: 'deadbeef', buildIdSource: 'commit' }
        )
      ).toEqual({ kind: 'noop' });
    });
  });

  describe('new baseline — cacheVersion changed', () => {
    it('clears when lastCacheVersion differs from incoming (commit source)', () => {
      const result = decideBuildCheck(
        { ...noBaseline, lastCommitBuildId: 'same-build', lastCacheVersion: '2' },
        { buildId: 'same-build', cacheVersion: '3', buildIdSource: 'commit' }
      );
      expect(result.kind).toBe('clear');
      expect((result as { kind: 'clear'; reason: string }).reason).toContain('2');
    });

    it('clears when lastCacheVersion differs from incoming (version source)', () => {
      const result = decideBuildCheck(
        { ...noBaseline, lastVersionBuildId: '7.5.0', lastCacheVersion: '2' },
        { buildId: '7.5.0', cacheVersion: '3', buildIdSource: 'version' }
      );
      expect(result.kind).toBe('clear');
      expect((result as { kind: 'clear'; reason: string }).reason).toContain('2');
    });

    it('adopts when cacheVersion arrives but was not previously stored (commit source)', () => {
      expect(
        decideBuildCheck(
          { ...noBaseline, lastCommitBuildId: 'abc', lastCacheVersion: undefined },
          { buildId: 'abc', cacheVersion: '1', buildIdSource: 'commit' }
        )
      ).toEqual({ kind: 'adopt' });
    });
  });

  describe('autoupdate source', () => {
    it('adopts when no lastBundleVersion baseline exists', () => {
      expect(
        decideBuildCheck(noBaseline, {
          buildId: 'bundle-abc.def',
          buildIdSource: 'autoupdate',
        })
      ).toEqual({ kind: 'adopt' });
    });

    it('returns noop when lastBundleVersion matches incoming', () => {
      expect(
        decideBuildCheck(
          { ...noBaseline, lastBundleVersion: 'bundle-abc.def' },
          { buildId: 'bundle-abc.def', buildIdSource: 'autoupdate' }
        )
      ).toEqual({ kind: 'noop' });
    });

    it('clears when lastBundleVersion differs from incoming', () => {
      const result = decideBuildCheck(
        { ...noBaseline, lastBundleVersion: 'bundle-old' },
        { buildId: 'bundle-new', buildIdSource: 'autoupdate' }
      );
      expect(result.kind).toBe('clear');
      expect((result as { kind: 'clear'; reason: string }).reason).toContain(
        'bundle-old'
      );
      expect((result as { kind: 'clear'; reason: string }).reason).toContain(
        'bundle-new'
      );
    });

    it('does not interact with lastCommitBuildId', () => {
      expect(
        decideBuildCheck(
          { ...noBaseline, lastCommitBuildId: 'commit-xyz', lastBundleVersion: undefined },
          { buildId: 'bundle-new', buildIdSource: 'autoupdate' }
        )
      ).toEqual({ kind: 'adopt' });
    });

    it('returns noop when buildId is absent for autoupdate source', () => {
      expect(
        decideBuildCheck(noBaseline, { buildIdSource: 'autoupdate' })
      ).toEqual({ kind: 'noop' });
    });
  });

  describe('hoisted cacheVersion mismatch — clears before source-specific path runs', () => {
    it('clears when commit source has no lastCommitBuildId but cacheVersion changed', () => {
      // Reproduces round-5 bug: adopt branch would have run and returned adopt,
      // skipping the cacheVersion change entirely.
      const result = decideBuildCheck(
        { ...noBaseline, lastCacheVersion: '1' },
        { buildId: 'abc', cacheVersion: '2', buildIdSource: 'commit' }
      );
      expect(result.kind).toBe('clear');
      expect((result as { kind: 'clear'; reason: string }).reason).toContain('1');
      expect((result as { kind: 'clear'; reason: string }).reason).toContain('2');
    });

    it('clears when version source has no lastVersionBuildId but cacheVersion changed', () => {
      const result = decideBuildCheck(
        { ...noBaseline, lastCacheVersion: '1' },
        { buildId: '7.5.0', cacheVersion: '2', buildIdSource: 'version' }
      );
      expect(result.kind).toBe('clear');
      expect((result as { kind: 'clear'; reason: string }).reason).toContain('1');
      expect((result as { kind: 'clear'; reason: string }).reason).toContain('2');
    });

    it('clears when autoupdate source has no lastBundleVersion but cacheVersion changed', () => {
      // autoupdate path previously had no cacheVersion handling at all; hoisted guard now catches it.
      const result = decideBuildCheck(
        { ...noBaseline, lastCacheVersion: '1' },
        { buildId: 'bundle-hash', cacheVersion: '2', buildIdSource: 'autoupdate' }
      );
      expect(result.kind).toBe('clear');
      expect((result as { kind: 'clear'; reason: string }).reason).toContain('1');
      expect((result as { kind: 'clear'; reason: string }).reason).toContain('2');
    });

    it('clears on sourceless observation when cacheVersion changed (was already working, verify still works)', () => {
      const result = decideBuildCheck(
        { ...noBaseline, lastCacheVersion: '1' },
        { cacheVersion: '2' }
      );
      expect(result.kind).toBe('clear');
      expect((result as { kind: 'clear'; reason: string }).reason).toContain('1');
      expect((result as { kind: 'clear'; reason: string }).reason).toContain('2');
    });

    it('preserves adopt when cacheVersion matches and no commit baseline (sanity)', () => {
      expect(
        decideBuildCheck(
          { ...noBaseline, lastCacheVersion: '1' },
          { buildId: 'abc', cacheVersion: '1', buildIdSource: 'commit' }
        )
      ).toEqual({ kind: 'adopt' });
    });
  });

  describe('commit source does not interact with lastBundleVersion', () => {
    it('uses lastCommitBuildId path even when lastBundleVersion is set', () => {
      expect(
        decideBuildCheck(
          {
            ...noBaseline,
            lastCommitBuildId: 'deadbeef',
            lastBundleVersion: 'bundle-xyz',
          },
          { buildId: 'deadbeef', buildIdSource: 'commit' }
        )
      ).toEqual({ kind: 'noop' });
    });
  });
});
