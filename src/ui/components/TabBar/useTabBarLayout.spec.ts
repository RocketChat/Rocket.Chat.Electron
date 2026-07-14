import type { Server } from '../../../servers/common';
import { computeIsCompact, computeVisibleServers } from './useTabBarLayout';

const buildServer = (url: string): Server => ({ url, title: url });

describe('computeVisibleServers', () => {
  it('returns all servers when they all fit in the available width', () => {
    const servers = [buildServer('a'), buildServer('b'), buildServer('c')];

    expect(computeVisibleServers(300, servers, undefined)).toEqual(servers);
  });

  it('slices to k servers based on available width', () => {
    const servers = [
      buildServer('a'),
      buildServer('b'),
      buildServer('c'),
      buildServer('d'),
    ];

    // 130 / 52 = 2.5 -> floor 2
    const result = computeVisibleServers(130, servers, undefined);

    expect(result).toEqual([buildServer('a'), buildServer('b')]);
  });

  it('swaps the active server into the last visible slot when it would be cut off', () => {
    const servers = [
      buildServer('a'),
      buildServer('b'),
      buildServer('c'),
      buildServer('d'),
    ];

    const result = computeVisibleServers(130, servers, 'd');

    expect(result).toEqual([buildServer('a'), buildServer('d')]);
  });

  it('does not modify the slice when the active server is already visible', () => {
    const servers = [buildServer('a'), buildServer('b'), buildServer('c')];

    const result = computeVisibleServers(130, servers, 'a');

    expect(result).toEqual([buildServer('a'), buildServer('b')]);
  });

  it('floors k at 1 even when available width is smaller than a single tab', () => {
    const servers = [buildServer('a'), buildServer('b')];

    const result = computeVisibleServers(10, servers, undefined);

    expect(result).toEqual([buildServer('a')]);
  });

  it('renders all servers when width is not yet measured (zero or negative)', () => {
    const servers = [buildServer('a'), buildServer('b')];

    expect(computeVisibleServers(0, servers, undefined)).toEqual(servers);
    expect(computeVisibleServers(-50, servers, undefined)).toEqual(servers);
  });

  it('fits k tabs exactly when the available width covers k tabs and k-1 gaps', () => {
    const servers = [
      buildServer('a'),
      buildServer('b'),
      buildServer('c'),
      buildServer('d'),
    ];

    // 3 tabs (52) + 2 gaps (8) = 172, no room for a trailing gap.
    const result = computeVisibleServers(172, servers, undefined);

    expect(result).toEqual([
      buildServer('a'),
      buildServer('b'),
      buildServer('c'),
    ]);
  });
});

describe('computeIsCompact', () => {
  it('returns false for a wide strip with few tabs', () => {
    expect(computeIsCompact(1000, 2)).toBe(false);
  });

  it('returns true when the average width per tab is at or below the compact threshold', () => {
    // 200 / 3 tabs = 66.67px avg, below the (64 + gap) per-tab threshold.
    expect(computeIsCompact(200, 3)).toBe(true);
  });

  it('returns false when width is not yet measured (zero or negative)', () => {
    expect(computeIsCompact(0, 3)).toBe(false);
    expect(computeIsCompact(-50, 3)).toBe(false);
  });

  it('returns false when there are no visible servers', () => {
    expect(computeIsCompact(500, 0)).toBe(false);
  });
});
