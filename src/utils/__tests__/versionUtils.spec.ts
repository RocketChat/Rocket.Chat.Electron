import { meetsMinimumVersion } from '../versionUtils';

describe('meetsMinimumVersion', () => {
  it('returns false for undefined versions', () => {
    expect(meetsMinimumVersion(undefined, '1.0.0')).toBe(false);
  });

  it('returns true when the version equals minimum', () => {
    expect(meetsMinimumVersion('1.2.3', '1.2.3')).toBe(true);
  });

  it('returns true when the version is greater than minimum', () => {
    expect(meetsMinimumVersion('1.2.4', '1.2.3')).toBe(true);
  });

  it('returns false when the version is lower than minimum', () => {
    expect(meetsMinimumVersion('1.2.2', '1.2.3')).toBe(false);
  });

  it('normalizes version strings that are not strict semver', () => {
    expect(meetsMinimumVersion('1.2', '1.2.0')).toBe(true);
    expect(meetsMinimumVersion('1.2', '1.2.1')).toBe(false);
  });

  it('returns false for non-coercible version strings', () => {
    expect(meetsMinimumVersion('not-a-version', '0.0.1')).toBe(false);
  });
});
