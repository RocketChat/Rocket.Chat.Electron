import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

const PROFILE_PATH = path.resolve(
  __dirname,
  '../../../Desktop.provisionprofile'
);
const TEAM_ID = 'S6UPZG7ZR3';
const APP_ID = `${TEAM_ID}.chat.rocket`;

const isDarwin = process.platform === 'darwin';

/**
 * Decode the CMS-wrapped provisioning profile to a plist XML string.
 */
function decodeProfile(profilePath: string): string {
  return execFileSync('security', ['cms', '-D', '-i', profilePath], {
    encoding: 'utf8',
  });
}

/**
 * Very small plist value extractor — handles string and array-of-string values
 * without pulling in a full plist parser dependency.
 */
function extractPlistString(plist: string, key: string): string | undefined {
  const keyIndex = plist.indexOf(`<key>${key}</key>`);
  if (keyIndex === -1) return undefined;
  const afterKey = plist.slice(keyIndex + `<key>${key}</key>`.length);
  const stringMatch = afterKey.match(/^\s*<string>([\s\S]*?)<\/string>/);
  if (stringMatch) return stringMatch[1];
  return undefined;
}

function extractPlistArray(plist: string, key: string): string[] {
  const keyIndex = plist.indexOf(`<key>${key}</key>`);
  if (keyIndex === -1) return [];
  const afterKey = plist.slice(keyIndex + `<key>${key}</key>`.length);
  const arrayMatch = afterKey.match(/^\s*<array>([\s\S]*?)<\/array>/);
  if (!arrayMatch) return [];
  const values: string[] = [];
  const re = /<string>([\s\S]*?)<\/string>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(arrayMatch[1])) !== null) {
    values.push(m[1]);
  }
  return values;
}

function extractPlistDate(plist: string, key: string): Date | undefined {
  const keyIndex = plist.indexOf(`<key>${key}</key>`);
  if (keyIndex === -1) return undefined;
  const afterKey = plist.slice(keyIndex + `<key>${key}</key>`.length);
  const dateMatch = afterKey.match(/^\s*<date>([\s\S]*?)<\/date>/);
  if (!dateMatch) return undefined;
  return new Date(dateMatch[1]);
}

/**
 * Extract base64-encoded DER certificate blobs from the DeveloperCertificates array.
 * Each <data> block in the plist is a base64-encoded DER certificate.
 */
function extractDeveloperCertsDer(plist: string): Buffer[] {
  const keyIndex = plist.indexOf('<key>DeveloperCertificates</key>');
  if (keyIndex === -1) return [];
  const afterKey = plist.slice(
    keyIndex + '<key>DeveloperCertificates</key>'.length
  );
  const arrayMatch = afterKey.match(/^\s*<array>([\s\S]*?)<\/array>/);
  if (!arrayMatch) return [];
  const certs: Buffer[] = [];
  const re = /<data>([\s\S]*?)<\/data>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(arrayMatch[1])) !== null) {
    const b64 = m[1].replace(/\s+/g, '');
    certs.push(Buffer.from(b64, 'base64'));
  }
  return certs;
}

// SHA-1 is required here, not chosen: Apple's `security find-identity` and the
// `DeveloperCertificates` DER fingerprints inside provisioning profiles are
// identified by SHA-1. We compare against Apple's own format, not securing
// anything ourselves. SHA-256 would not match any value Apple emits.
// codeql[js/weak-cryptographic-algorithm]
function sha1Hex(buf: Buffer): string {
  // codeql[js/weak-cryptographic-algorithm]
  return crypto.createHash('sha1').update(buf).digest('hex').toUpperCase();
}

/**
 * Extract PEM cert blocks from openssl pkcs12 output.
 */
function parsePemCerts(output: string): string[] {
  const certs: string[] = [];
  const re = /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(output)) !== null) {
    certs.push(m[0]);
  }
  return certs;
}

/**
 * Convert a PEM certificate string to its DER Buffer.
 */
function pemToDer(pem: string): Buffer {
  const b64 = pem
    .replace('-----BEGIN CERTIFICATE-----', '')
    .replace('-----END CERTIFICATE-----', '')
    .replace(/\s+/g, '');
  return Buffer.from(b64, 'base64');
}

/**
 * Run openssl pkcs12 to dump certs. Tries with -legacy first (openssl 3.x),
 * falls back without it for openssl 1.x.
 *
 * Uses -passin file:<tmpfile> to avoid exposing the password in argv/ps output.
 * All error paths are redacted to prevent secret leakage.
 */
function dumpP12Certs(p12Path: string, password: string): string {
  // Write password to a temp file with restricted permissions to avoid
  // exposing it in argv (e.g. via `ps`).
  const passTmpPath = path.join(os.tmpdir(), crypto.randomUUID());
  fs.writeFileSync(passTmpPath, password, { mode: 0o600 });

  try {
    const baseArgs = [
      'pkcs12',
      '-in',
      p12Path,
      '-nokeys',
      '-passin',
      `file:${passTmpPath}`,
    ];

    try {
      return execFileSync('openssl', [...baseArgs, '-legacy'], {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch {
      // -legacy flag not recognised on openssl 1.x — retry without it
      try {
        return execFileSync('openssl', baseArgs, {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe'],
        });
      } catch {
        throw new Error(
          'openssl pkcs12 failed; original error redacted to prevent secret leakage'
        );
      }
    }
  } finally {
    // Always remove the password tempfile, even on failure.
    try {
      fs.unlinkSync(passTmpPath);
    } catch {
      // ignore cleanup errors
    }
  }
}

// ---------------------------------------------------------------------------

const describeOnDarwin = isDarwin ? describe : describe.skip;

describeOnDarwin('MAS signing assets', () => {
  let tmpP12Path: string | null = null;
  let tmpKeychainPath: string | null = null;

  afterAll(() => {
    if (tmpP12Path && fs.existsSync(tmpP12Path)) {
      try {
        fs.unlinkSync(tmpP12Path);
      } catch {
        // ignore — keep cleanup running
      }
    }
    if (tmpKeychainPath) {
      try {
        execFileSync('security', ['delete-keychain', tmpKeychainPath], {
          stdio: ['pipe', 'pipe', 'pipe'],
        });
      } catch {
        // ignore errors — keychain may already be gone
      }
      try {
        if (fs.existsSync(tmpKeychainPath)) {
          fs.unlinkSync(tmpKeychainPath);
        }
      } catch {
        // ignore
      }
    }
  });

  it('Desktop.provisionprofile exists at repo root', () => {
    expect(fs.existsSync(PROFILE_PATH)).toBe(true);
  });

  describe('provisioning profile content', () => {
    let plist: string;

    beforeAll(() => {
      plist = decodeProfile(PROFILE_PATH);
    });

    it('Name is "Desktop"', () => {
      expect(extractPlistString(plist, 'Name')).toBe('Desktop');
    });

    it('Platform includes "OSX"', () => {
      const platforms = extractPlistArray(plist, 'Platform');
      expect(platforms).toContain('OSX');
    });

    it('TeamIdentifier includes the expected team ID', () => {
      const teams = extractPlistArray(plist, 'TeamIdentifier');
      expect(teams).toContain(TEAM_ID);
    });

    it('Entitlements contain the correct application-identifier', () => {
      // application-identifier is nested inside the Entitlements dict
      const keyIndex = plist.indexOf('<key>Entitlements</key>');
      expect(keyIndex).toBeGreaterThan(-1);
      const entitlementsSlice = plist.slice(keyIndex);
      // Extract the dict block following the key
      const dictMatch = entitlementsSlice.match(
        /^\s*<key>Entitlements<\/key>\s*<dict>([\s\S]*?)<\/dict>/
      );
      expect(dictMatch).not.toBeNull();
      const entitlementsDict = dictMatch![1];
      const appIdIndex = entitlementsDict.indexOf(
        '<key>com.apple.application-identifier</key>'
      );
      expect(appIdIndex).toBeGreaterThan(-1);
      const afterKey = entitlementsDict.slice(
        appIdIndex + '<key>com.apple.application-identifier</key>'.length
      );
      const valueMatch = afterKey.match(/^\s*<string>([\s\S]*?)<\/string>/);
      expect(valueMatch).not.toBeNull();
      expect(valueMatch![1]).toBe(APP_ID);
    });

    it('profile is not expired', () => {
      const expiration = extractPlistDate(plist, 'ExpirationDate');
      expect(expiration).toBeDefined();
      const now = new Date();
      if (expiration) {
        const daysRemaining =
          (expiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        if (daysRemaining < 30) {
          console.warn(
            `WARNING: Desktop.provisionprofile expires in ${Math.floor(daysRemaining)} days (${expiration.toISOString()})`
          );
        }
        expect(expiration.getTime()).toBeGreaterThan(now.getTime());
      }
    });

    it('profile has at least one DeveloperCertificates entry', () => {
      const certs = extractDeveloperCertsDer(plist);
      expect(certs.length).toBeGreaterThan(0);
    });
  });

  const cscLink = process.env.CSC_LINK;
  const cscKeyPassword = process.env.CSC_KEY_PASSWORD;
  const hasCsc = Boolean(cscLink) && Boolean(cscKeyPassword);

  const itCsc = hasCsc ? it : it.skip;

  describe('cert-in-profile matches p12 cert (requires CSC_LINK env)', () => {
    if (!hasCsc) {
      console.warn(
        'CSC_LINK or CSC_KEY_PASSWORD not set — skipping p12/profile cert-match test'
      );
    }

    itCsc('profile cert SHA1 is present in the signing p12', () => {
      // Read password inside the test to minimise the number of frames
      // it passes through. Never interpolate it into error messages.
      const password = process.env.CSC_KEY_PASSWORD ?? '';

      // Decode base64 p12 to a temp file
      const p12Bytes = Buffer.from(cscLink!, 'base64');
      tmpP12Path = path.join(
        os.tmpdir(),
        `mas-signing-${crypto.randomUUID()}.p12`
      );
      fs.writeFileSync(tmpP12Path, p12Bytes, { mode: 0o600 });

      // Extract SHA1s from profile
      const plist = decodeProfile(PROFILE_PATH);
      const profileCerts = extractDeveloperCertsDer(plist);
      const profileSha1s = new Set(profileCerts.map(sha1Hex));

      // Extract SHA1s from p12 (password handled via tempfile inside dumpP12Certs)
      const p12Output = dumpP12Certs(tmpP12Path, password);
      const p12Pems = parsePemCerts(p12Output);
      const p12Sha1s = new Set(p12Pems.map((pem) => sha1Hex(pemToDer(pem))));

      // Get cert subjects for diagnostics (does not touch password)
      const getSubject = (pem: string): string => {
        try {
          return execFileSync(
            'openssl',
            ['x509', '-noout', '-subject', '-in', '/dev/stdin'],
            {
              input: pem,
              encoding: 'utf8',
              stdio: ['pipe', 'pipe', 'pipe'],
            }
          ).trim();
        } catch {
          return '(could not parse subject)';
        }
      };

      // Check overlap
      const intersection = [...profileSha1s].filter((s) => p12Sha1s.has(s));

      if (intersection.length === 0) {
        console.error('=== CERT MISMATCH DIAGNOSTICS ===');
        console.error('Profile cert SHA1s:');
        profileSha1s.forEach((sha1) => console.error(`  ${sha1}`));
        console.error('p12 cert SHA1s:');
        p12Pems.forEach((pem) => {
          const sha1 = sha1Hex(pemToDer(pem));
          const subject = getSubject(pem);
          console.error(`  ${sha1}  ${subject}`);
        });
        console.error('=================================');
      }

      expect(intersection.length).toBeGreaterThan(0);
    });

    itCsc(
      'p12 contains a usable codesigning identity for the profile cert',
      () => {
        // Read password inside the test to minimise the number of frames
        // it passes through. Never interpolate it into error messages.
        const password = process.env.CSC_KEY_PASSWORD ?? '';

        // Ensure p12 tempfile exists (may have been written by the previous test).
        // If not, write it now.
        if (!tmpP12Path || !fs.existsSync(tmpP12Path)) {
          const p12Bytes = Buffer.from(cscLink!, 'base64');
          tmpP12Path = path.join(
            os.tmpdir(),
            `mas-signing-${crypto.randomUUID()}.p12`
          );
          fs.writeFileSync(tmpP12Path, p12Bytes, { mode: 0o600 });
        }

        // Compute the profile cert SHA1(s) we need to verify.
        const plist = decodeProfile(PROFILE_PATH);
        const profileCerts = extractDeveloperCertsDer(plist);
        const profileSha1s = profileCerts.map(sha1Hex);

        // Create a short-lived temp keychain to avoid polluting the login keychain.
        const keychainPwd = crypto.randomBytes(16).toString('hex');
        tmpKeychainPath = path.join(
          os.tmpdir(),
          `mas-signing-test-${crypto.randomUUID()}.keychain-db`
        );

        try {
          execFileSync(
            'security',
            ['create-keychain', '-p', keychainPwd, tmpKeychainPath],
            { stdio: ['pipe', 'pipe', 'pipe'] }
          );
        } catch {
          throw new Error(
            'security create-keychain failed; original error redacted to prevent secret leakage'
          );
        }

        try {
          execFileSync(
            'security',
            ['unlock-keychain', '-p', keychainPwd, tmpKeychainPath],
            { stdio: ['pipe', 'pipe', 'pipe'] }
          );
        } catch {
          throw new Error(
            'security unlock-keychain failed; original error redacted to prevent secret leakage'
          );
        }

        // Note: 'security import -P' briefly exposes the password in argv; we
        // sanitize all error paths to prevent persistent leakage. Apple's security
        // tool does not support a file-based passin equivalent.
        try {
          execFileSync(
            'security',
            [
              'import',
              tmpP12Path,
              '-k',
              tmpKeychainPath,
              '-P',
              password,
              '-T',
              '/usr/bin/codesign',
              '-T',
              '/usr/bin/security',
            ],
            { stdio: ['pipe', 'pipe', 'pipe'] }
          );
        } catch {
          throw new Error(
            'security import failed; original error redacted to prevent secret leakage'
          );
        }

        // Query usable codesigning identities from the temp keychain.
        let findOutput: string;
        try {
          findOutput = execFileSync(
            'security',
            ['find-identity', '-v', '-p', 'codesigning', tmpKeychainPath],
            { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
          );
        } catch {
          throw new Error(
            'security find-identity failed; original error redacted to prevent secret leakage'
          );
        }

        // Assert that at least one profile cert SHA1 appears in the identity list
        // (case-insensitive — SHA1 hex is not secret, safe to include in messages).
        const matchingSha1 = profileSha1s.find((sha1) =>
          findOutput.toUpperCase().includes(sha1.toUpperCase())
        );

        if (!matchingSha1) {
          throw new Error(
            `No usable codesigning identity found in MAC_CSC_LINK p12 for profile cert SHA1 ${profileSha1s.join(', ')}`
          );
        }

        expect(matchingSha1).toBeDefined();
      }
    );
  });
});
