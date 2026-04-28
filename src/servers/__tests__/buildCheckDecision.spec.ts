import { decideBuildCheck } from '../buildCheckDecision';

const noBaseline = {
  lastServerBuildId: undefined,
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
    it('adopts when no legacy or new baseline exists', () => {
      expect(
        decideBuildCheck(noBaseline, {
          buildId: 'abc123',
          buildIdSource: 'commit',
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
      // Cross-source — cannot confidently compare; treat as first observation.
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
      expect(
        decideBuildCheck(serverWithVersion, {
          buildId: 'abc123',
          buildIdSource: 'commit',
        })
      ).toEqual({ kind: 'adopt' });
    });
  });

  describe('new baseline — buildId changed', () => {
    it('clears when lastServerBuildId differs from incoming buildId', () => {
      const result = decideBuildCheck(
        { ...noBaseline, lastServerBuildId: 'old-build', lastCacheVersion: '2' },
        { buildId: 'new-build', cacheVersion: '2', buildIdSource: 'commit' }
      );
      expect(result.kind).toBe('clear');
      expect((result as { kind: 'clear'; reason: string }).reason).toContain(
        'old-build'
      );
    });
  });

  describe('new baseline — cacheVersion changed', () => {
    it('clears when lastCacheVersion differs from incoming cacheVersion', () => {
      const result = decideBuildCheck(
        { ...noBaseline, lastServerBuildId: 'same-build', lastCacheVersion: '2' },
        { buildId: 'same-build', cacheVersion: '3', buildIdSource: 'commit' }
      );
      expect(result.kind).toBe('clear');
      expect((result as { kind: 'clear'; reason: string }).reason).toContain(
        '2'
      );
    });
  });

  describe('partial baseline — new field arriving', () => {
    it('adopts when cacheVersion arrives but was not previously stored', () => {
      expect(
        decideBuildCheck(
          { ...noBaseline, lastServerBuildId: 'abc', lastCacheVersion: undefined },
          { buildId: 'abc', cacheVersion: '1', buildIdSource: 'commit' }
        )
      ).toEqual({ kind: 'adopt' });
    });

    it('adopts when buildId arrives but was not previously stored', () => {
      expect(
        decideBuildCheck(
          { ...noBaseline, lastServerBuildId: undefined, lastCacheVersion: '1' },
          { buildId: 'abc', cacheVersion: '1', buildIdSource: 'commit' }
        )
      ).toEqual({ kind: 'adopt' });
    });
  });

  describe('no change', () => {
    it('returns noop when baseline matches incoming on both fields', () => {
      expect(
        decideBuildCheck(
          { ...noBaseline, lastServerBuildId: 'abc', lastCacheVersion: '2' },
          { buildId: 'abc', cacheVersion: '2', buildIdSource: 'commit' }
        )
      ).toEqual({ kind: 'noop' });
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

    it('does not interact with lastServerBuildId', () => {
      // Autoupdate with a stored lastServerBuildId — should only look at lastBundleVersion
      expect(
        decideBuildCheck(
          { ...noBaseline, lastServerBuildId: 'commit-xyz', lastBundleVersion: undefined },
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

  describe('commit source does not interact with lastBundleVersion', () => {
    it('uses lastServerBuildId path even when lastBundleVersion is set', () => {
      // commit source with both baselines present — commit path uses lastServerBuildId
      expect(
        decideBuildCheck(
          {
            ...noBaseline,
            lastServerBuildId: 'deadbeef',
            lastBundleVersion: 'bundle-xyz',
          },
          { buildId: 'deadbeef', buildIdSource: 'commit' }
        )
      ).toEqual({ kind: 'noop' });
    });
  });
});
