// Live wire-contract test for the Rocket.Chat /api/info endpoint.
//
// WHY THIS EXISTS: a `uniqueId` field that the desktop's ServerInfo type
// assumed the endpoint returned was fictional — it was never actually part
// of the real /api/info response, and this went uncaught for 2.5 years
// because every test that exercised this code path did so against
// self-referential mocks (fixtures the desktop repo wrote itself) rather
// than the real server. Mocks can only fail the same way the code that
// authored them already fails, so they can't catch this class of drift.
//
// This spec instead fetches the LIVE public /api/info endpoint
// (https://open.rocket.chat/api/info — same unauthenticated call the
// desktop makes in src/servers/supportedVersions/main.ts) and asserts the
// shape the desktop actually depends on, sourced from the server-side
// implementation (apps/meteor/server/api/lib/getServerInfo.ts) rather than
// from the desktop's own types.
//
// SKIP SEMANTICS: a network outage must not fail CI, but a reachable server
// that has drifted from the contract must. The suite is skipped (with a
// console.warn explaining why) only when the endpoint could not be reached
// for network reasons (timeout/DNS/5xx) or when SKIP_CONTRACT_TESTS=1 is
// set. Any other outcome — including a 2xx response with an unexpected
// shape — runs the assertions and fails normally.

import axios from 'axios';

const ENDPOINT = 'https://open.rocket.chat/api/info';
const FETCH_TIMEOUT_MS = 15000;
const MAX_ATTEMPTS = 2;

let body: Record<string, unknown> | undefined;
let skipReason: string | undefined;

const isNetworkFailure = (error: unknown): boolean => {
  if (!axios.isAxiosError(error)) return false;
  // No response at all → timeout, DNS failure, connection refused, etc.
  if (!error.response) return true;
  // 5xx means the server itself is unhealthy, not that the contract changed.
  return error.response.status >= 500;
};

const fetchServerInfo = async (): Promise<Record<string, unknown>> => {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      // Each retry must wait for the previous attempt's outcome, not run
      // concurrently with it.
      // eslint-disable-next-line no-await-in-loop
      const response = await axios.get(ENDPOINT, {
        timeout: FETCH_TIMEOUT_MS,
      });
      return response.data;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
};

beforeAll(
  async () => {
    if (process.env.SKIP_CONTRACT_TESTS === '1') {
      skipReason = 'SKIP_CONTRACT_TESTS=1 is set';
      console.warn(`Skipping /api/info contract tests: ${skipReason}.`);
      return;
    }

    try {
      body = await fetchServerInfo();
    } catch (error) {
      if (isNetworkFailure(error)) {
        skipReason = `network error reaching ${ENDPOINT}: ${
          axios.isAxiosError(error) ? error.message : String(error)
        }`;
        console.warn(`Skipping /api/info contract tests: ${skipReason}.`);
        return;
      }
      throw error;
    }
  },
  FETCH_TIMEOUT_MS * MAX_ATTEMPTS + 5000
);

describe('/api/info wire contract', () => {
  test('version is trimmed major.minor, not three segments', () => {
    if (skipReason) return;
    expect(typeof body?.version).toBe('string');
    expect(body?.version).toMatch(/^\d+\.\d+$/);
  });

  test('uniqueId is not present on the unauthenticated response', () => {
    if (skipReason) return;
    expect(body && 'uniqueId' in body).toBe(false);
  });

  test('commit and info blocks are not present to unauthenticated callers', () => {
    if (skipReason) return;
    expect(body && 'commit' in body).toBe(false);
    expect(body && 'info' in body).toBe(false);
  });

  test('minimumClientVersions has string desktop and mobile versions', () => {
    if (skipReason) return;
    const minimumClientVersions = body?.minimumClientVersions as
      | Record<string, unknown>
      | undefined;
    expect(typeof minimumClientVersions).toBe('object');
    expect(typeof minimumClientVersions?.desktop).toBe('string');
    expect(typeof minimumClientVersions?.mobile).toBe('string');
  });

  test('supportedVersions.signed, when present, is a non-empty JWT', () => {
    if (skipReason) return;
    const supportedVersions = body?.supportedVersions as
      | Record<string, unknown>
      | undefined;
    if (supportedVersions === undefined) return;
    expect(typeof supportedVersions.signed).toBe('string');
    expect((supportedVersions.signed as string).length).toBeGreaterThan(0);
    expect((supportedVersions.signed as string).split('.').length).toBe(3);
  });

  test('success is true', () => {
    if (skipReason) return;
    expect(body?.success).toBe(true);
  });
});
