import * as core from '@actions/core';
import * as fs from 'fs';
import * as glob from 'glob';
import * as path from 'path';
import { runAndBuffer } from '../shell';

export interface SignatureResult {
  file: string;
  valid: boolean;
  status: string;
  signer?: string;
  error?: string;
}

const verifyWithPowerShell = async (
  filePath: string
): Promise<SignatureResult> => {
  const fileName = path.basename(filePath);

  try {
    const escapedPath = filePath.replace(/'/g, "''");
    const psCommand = `"Get-AuthenticodeSignature -LiteralPath '${escapedPath}' | ConvertTo-Json -Compress"`;
    const command = `chcp 65001 >NUL & powershell.exe -NoProfile -NonInteractive -InputFormat None -Command ${psCommand}`;

    const output = await runAndBuffer(command);
    const result = JSON.parse(output.trim());

    const isValid = result.Status === 0 || result.Status === 'Valid';
    const statusText =
      result.Status === 0 ? 'Valid' : String(result.Status ?? 'Unknown');
    const signerSubject = result.SignerCertificate?.Subject;

    return {
      file: fileName,
      valid: isValid,
      status: statusText,
      signer: signerSubject || undefined,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      file: fileName,
      valid: false,
      status: 'Error',
      error: errorMessage,
    };
  }
};

export const verifySignature = async (
  filePath: string
): Promise<SignatureResult> => {
  return verifyWithPowerShell(filePath);
};

export const verifyExecutableSignature = async (
  distPath: string
): Promise<void> => {
  core.info('Verifying Windows executable signatures...');

  const unpackedDirs = [
    'win-unpacked',
    'win-ia32-unpacked',
    'win-arm64-unpacked',
  ];

  const results: SignatureResult[] = [];
  let hasFailures = false;

  for (const dir of unpackedDirs) {
    const exePath = path.join(distPath, dir, 'Rocket.Chat.exe');

    if (!fs.existsSync(exePath)) {
      core.debug(`No executable found in ${dir}`);
      continue;
    }

    core.info(`Verifying: ${path.relative(distPath, exePath)}`);
    const result = await verifySignature(exePath);
    results.push(result);

    if (result.valid) {
      core.info(`  ✓ Valid signature - Signer: ${result.signer || 'Unknown'}`);
    } else {
      core.error(
        `  ✗ INVALID: ${result.status}${result.error ? ` - ${result.error}` : ''}`
      );
      hasFailures = true;
    }
  }

  if (results.length === 0) {
    core.warning('No executables found to verify');
    return;
  }

  if (hasFailures) {
    throw new Error(
      'Executable signature verification failed - one or more files have invalid signatures'
    );
  }

  core.info(`✅ All ${results.length} executable(s) have valid signatures`);
};

export const verifyInstallerSignatures = async (
  distPath: string
): Promise<void> => {
  core.info('Verifying Windows installer signatures...');

  const patterns = ['*.exe', '*.msi'];
  const results: SignatureResult[] = [];
  let hasFailures = false;

  for (const pattern of patterns) {
    const files = glob.sync(pattern, {
      cwd: distPath,
      absolute: true,
      ignore: [
        '**/win-unpacked/**',
        '**/win-ia32-unpacked/**',
        '**/win-arm64-unpacked/**',
      ],
    });

    for (const file of files) {
      core.info(`Verifying: ${path.basename(file)}`);
      const result = await verifySignature(file);
      results.push(result);

      if (result.valid) {
        core.info(
          `  ✓ Valid signature - Signer: ${result.signer || 'Unknown'}`
        );
      } else {
        core.error(
          `  ✗ INVALID: ${result.status}${result.error ? ` - ${result.error}` : ''}`
        );
        hasFailures = true;
      }
    }
  }

  if (results.length === 0) {
    core.warning('No installers found to verify');
    return;
  }

  if (hasFailures) {
    throw new Error(
      'Installer signature verification failed - one or more files have invalid signatures'
    );
  }

  core.info(`✅ All ${results.length} installer(s) have valid signatures`);
};
