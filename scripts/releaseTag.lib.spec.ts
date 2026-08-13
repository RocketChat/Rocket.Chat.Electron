import { parse } from 'semver';

import {
  evaluateTag,
  getChannel,
  getLatestTagForChannel,
  normalizeTag,
} from './releaseTag.lib';

const v = (version: string) => {
  const parsed = parse(version);
  if (!parsed) throw new Error(`Invalid test version: ${version}`);
  return parsed;
};

describe('getChannel', () => {
  it('detects stable', () => {
    expect(getChannel(v('4.16.0'))).toBe('stable');
  });

  it('detects alpha', () => {
    expect(getChannel(v('4.16.0-alpha.1'))).toBe('alpha');
  });

  it('detects beta', () => {
    expect(getChannel(v('4.16.0-beta.1'))).toBe('beta');
  });

  it('detects rc as candidate', () => {
    expect(getChannel(v('4.16.0-rc.1'))).toBe('candidate');
  });

  it('detects candidate', () => {
    expect(getChannel(v('4.16.0-candidate.1'))).toBe('candidate');
  });

  it('falls back to prerelease for unknown pre-release identifiers', () => {
    expect(getChannel(v('4.16.0-nightly.1'))).toBe('prerelease');
  });
});

describe('normalizeTag', () => {
  it('strips a leading v', () => {
    expect(normalizeTag('v4.16.0')).toBe('4.16.0');
  });

  it('leaves tags without a leading v untouched', () => {
    expect(normalizeTag('4.16.0')).toBe('4.16.0');
  });
});

describe('getLatestTagForChannel', () => {
  it('selects the latest stable tag', () => {
    const tags = ['4.14.0', '4.15.0', '4.16.0'];
    expect(getLatestTagForChannel(tags, 'stable')?.version).toBe('4.16.0');
  });

  it('an alpha does not shadow a stable', () => {
    const tags = ['4.16.0', '4.17.0-alpha.1'];
    expect(getLatestTagForChannel(tags, 'stable')?.version).toBe('4.16.0');
  });

  it('a stable does not shadow an alpha', () => {
    const tags = ['4.16.0', '4.17.0-alpha.1'];
    expect(getLatestTagForChannel(tags, 'alpha')?.version).toBe(
      '4.17.0-alpha.1'
    );
  });

  it('returns null when there is no tag in the channel', () => {
    const tags = ['4.16.0'];
    expect(getLatestTagForChannel(tags, 'beta')).toBeNull();
  });
});

describe('evaluateTag', () => {
  it('rejects when the tag already exists', () => {
    const result = evaluateTag({
      version: v('4.16.0'),
      existingTags: ['4.16.0'],
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/already exists/);
  });

  it('rejects a channel regression', () => {
    const result = evaluateTag({
      version: v('4.15.0'),
      existingTags: ['4.16.0'],
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/not greater than/);
    expect(result.latestInChannel?.version).toBe('4.16.0');
  });

  it('force overrides a channel regression with a warning', () => {
    const result = evaluateTag({
      version: v('4.15.0'),
      existingTags: ['4.16.0'],
      force: true,
    });
    expect(result.ok).toBe(true);
    expect(result.warning).toMatch(/not greater than/);
  });

  it('force does NOT override a tag-exists rejection', () => {
    const result = evaluateTag({
      version: v('4.16.0'),
      existingTags: ['4.16.0'],
      force: true,
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/already exists/);
  });

  it('allows the first release in a channel', () => {
    const result = evaluateTag({
      version: v('4.16.0-beta.1'),
      existingTags: ['4.16.0'],
    });
    expect(result.ok).toBe(true);
    expect(result.latestInChannel).toBeNull();
  });

  it('allows a version greater than the latest in its channel', () => {
    const result = evaluateTag({
      version: v('4.17.0'),
      existingTags: ['4.16.0'],
    });
    expect(result.ok).toBe(true);
    expect(result.latestInChannel?.version).toBe('4.16.0');
  });
});
