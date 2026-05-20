import { execFile as execFileCb } from 'child_process';
import { promisify } from 'util';

import { app } from 'electron';

const execFile = promisify(execFileCb);

export type TelephonyDiagnosticStatus = 'pass' | 'fail' | 'unknown';

export type TelephonyDiagnosticCheck = {
  id: string;
  label: string;
  status: TelephonyDiagnosticStatus;
  details?: string;
};

export type TelephonyDiagnostics = {
  platform: NodeJS.Platform;
  generatedAt: string;
  checks: TelephonyDiagnosticCheck[];
};

const SCHEMES = ['tel', 'callto'] as const;

const checkIsDefault = (scheme: string): TelephonyDiagnosticCheck => {
  try {
    const isDefault = app.isDefaultProtocolClient(scheme);
    return {
      id: `isDefault.${scheme}`,
      label: `${scheme}:// is set to Rocket.Chat`,
      status: isDefault ? 'pass' : 'fail',
    };
  } catch (err) {
    return {
      id: `isDefault.${scheme}`,
      label: `${scheme}:// is set to Rocket.Chat`,
      status: 'unknown',
      details: err instanceof Error ? err.message : String(err),
    };
  }
};

// ---------------------------------------------------------------------------
// Windows helpers
// ---------------------------------------------------------------------------

const WIN_REG_SZ_RE = /REG_SZ\s+(.+)/;

/**
 * Query a registry value, falling back from HKCU to HKLM.
 * Returns the trimmed value string or null if missing/error.
 */
const queryRegValue = async (
  keyPath: string,
  valueName: string | null
): Promise<string | null> => {
  const hives = ['HKCU', 'HKLM'] as const;
  const args = valueName === null ? ['/ve'] : ['/v', valueName];

  for (const hive of hives) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const { stdout } = await execFile('reg', [
        'query',
        `${hive}\\${keyPath}`,
        ...args,
      ]);
      const match = WIN_REG_SZ_RE.exec(stdout);
      if (match) {
        return match[1].trim();
      }
    } catch {
      // hive miss — try next
    }
  }
  return null;
};

const checkWindowsRegisteredApp =
  async (): Promise<TelephonyDiagnosticCheck> => {
    const id = 'windows.registeredApp';
    const label = 'Windows: Rocket.Chat is in RegisteredApplications';
    const expected = 'Software\\Rocket.Chat\\Capabilities';
    try {
      const value = await queryRegValue(
        'Software\\RegisteredApplications',
        'Rocket.Chat'
      );
      if (value === null) {
        return {
          id,
          label,
          status: 'fail',
          details: 'Key not found in HKCU or HKLM',
        };
      }
      return {
        id,
        label,
        status: value === expected ? 'pass' : 'fail',
        details:
          value !== expected
            ? `Expected "${expected}", got "${value}"`
            : undefined,
      };
    } catch (err) {
      return {
        id,
        label,
        status: 'unknown',
        details: err instanceof Error ? err.message : String(err),
      };
    }
  };

const checkWindowsCapability = async (
  scheme: string,
  expectedProgId: string
): Promise<TelephonyDiagnosticCheck> => {
  const id = `windows.capabilities.${scheme}`;
  const label = `Windows: Capabilities URLAssociation for ${scheme}`;
  try {
    const value = await queryRegValue(
      `Software\\Rocket.Chat\\Capabilities\\URLAssociations`,
      scheme
    );
    if (value === null) {
      return {
        id,
        label,
        status: 'fail',
        details: 'Key not found in HKCU or HKLM',
      };
    }
    return {
      id,
      label,
      status: value === expectedProgId ? 'pass' : 'fail',
      details:
        value !== expectedProgId
          ? `Expected "${expectedProgId}", got "${value}"`
          : undefined,
    };
  } catch (err) {
    return {
      id,
      label,
      status: 'unknown',
      details: err instanceof Error ? err.message : String(err),
    };
  }
};

const checkWindowsProgId = async (
  scheme: string
): Promise<TelephonyDiagnosticCheck> => {
  const progId = `RocketChat.${scheme}`;
  const id = `windows.progid.${scheme}`;
  const label = `Windows: ${progId} ProgID points at Rocket.Chat.exe`;
  try {
    const value = await queryRegValue(
      `Software\\Classes\\${progId}\\shell\\open\\command`,
      null
    );
    if (value === null) {
      return {
        id,
        label,
        status: 'fail',
        details: 'Key not found in HKCU or HKLM',
      };
    }
    const passes = value.toLowerCase().includes('rocket.chat.exe');
    return {
      id,
      label,
      status: passes ? 'pass' : 'fail',
      details: !passes ? `Command value: "${value}"` : undefined,
    };
  } catch (err) {
    return {
      id,
      label,
      status: 'unknown',
      details: err instanceof Error ? err.message : String(err),
    };
  }
};

const getWindowsChecks = async (): Promise<TelephonyDiagnosticCheck[]> => {
  const capabilityChecks = await Promise.all(
    SCHEMES.map((scheme) => {
      const progId = `RocketChat.${scheme}`;
      return checkWindowsCapability(scheme, progId);
    })
  );

  const progIdChecks = await Promise.all(
    SCHEMES.map((scheme) => checkWindowsProgId(scheme))
  );

  const registeredAppCheck = await checkWindowsRegisteredApp();

  return [registeredAppCheck, ...capabilityChecks, ...progIdChecks];
};

// ---------------------------------------------------------------------------
// macOS helpers
// ---------------------------------------------------------------------------

const getBundleBasename = (pathLike: string): string | null => {
  const match = pathLike.match(/\/([^/]+\.app)(?:\/|$)/);
  return match?.[1] ?? null;
};

const checkDarwinHandler = async (
  scheme: string
): Promise<TelephonyDiagnosticCheck> => {
  const id = `darwin.handler.${scheme}`;
  const label = `macOS: ${scheme}:// handler reports Rocket.Chat`;
  try {
    const info = await app.getApplicationInfoForProtocol(`${scheme}:1`);
    // Compare bundle basenames so the check holds in dev (Electron.app ===
    // Electron.app, even across worktrees / sibling Electron installs) and in
    // packaged builds (Rocket.Chat.app === Rocket.Chat.app). The intent is
    // "the registered handler IS the same bundle as the currently running app".
    const ourBundle = getBundleBasename(process.execPath);
    const theirBundle = getBundleBasename(info.path);
    const passes =
      ourBundle !== null && theirBundle !== null && ourBundle === theirBundle;
    return {
      id,
      label,
      status: passes ? 'pass' : 'fail',
      details: `Handler: "${info.name}" at ${info.path}`,
    };
  } catch (err) {
    return {
      id,
      label,
      status: 'unknown',
      details: err instanceof Error ? err.message : String(err),
    };
  }
};

const getDarwinChecks = (): Promise<TelephonyDiagnosticCheck[]> =>
  Promise.all(SCHEMES.map((scheme) => checkDarwinHandler(scheme)));

// ---------------------------------------------------------------------------
// Linux helpers
// ---------------------------------------------------------------------------

const checkLinuxXdg = async (
  scheme: string
): Promise<TelephonyDiagnosticCheck> => {
  const id = `linux.xdg.${scheme}`;
  const label = `Linux: xdg-mime default for ${scheme} is Rocket.Chat`;
  try {
    const { stdout } = await execFile('xdg-mime', [
      'query',
      'default',
      `x-scheme-handler/${scheme}`,
    ]);
    const trimmed = stdout.trim();
    const passes = trimmed.toLowerCase().includes('rocket');
    return {
      id,
      label,
      status: passes ? 'pass' : 'fail',
      details: trimmed || undefined,
    };
  } catch (err) {
    return {
      id,
      label,
      status: 'unknown',
      details: err instanceof Error ? err.message : String(err),
    };
  }
};

const getLinuxChecks = (): Promise<TelephonyDiagnosticCheck[]> =>
  Promise.all(SCHEMES.map((scheme) => checkLinuxXdg(scheme)));

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export const getTelephonyDiagnostics =
  async (): Promise<TelephonyDiagnostics> => {
    const isDefaultChecks = SCHEMES.map((scheme) => checkIsDefault(scheme));

    let platformChecks: TelephonyDiagnosticCheck[] = [];
    try {
      if (process.platform === 'win32') {
        platformChecks = await getWindowsChecks();
      } else if (process.platform === 'darwin') {
        platformChecks = await getDarwinChecks();
      } else if (process.platform === 'linux') {
        platformChecks = await getLinuxChecks();
      }
    } catch {
      // Platform checks failed wholesale — already handled per-check; ignore here
    }

    return {
      platform: process.platform,
      generatedAt: new Date().toISOString(),
      checks: [...isDefaultChecks, ...platformChecks],
    };
  };
