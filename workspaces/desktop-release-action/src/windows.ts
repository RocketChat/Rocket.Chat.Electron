import * as core from '@actions/core';

import { run, runAndBuffer, runElectronBuilder } from './shell';

const addCertToStore = async (store: 'ROOT' | 'CA' | 'MY', path?: string, user: boolean = true) => {
  if (!path) return;
  const userFlag = user ? '-user ' : '';
  await run(`certutil ${userFlag}-addstore "${store}" "${path}"`);
};

const computeThumbprint = async (certPath: string): Promise<string> => {
  const out = await runAndBuffer(
    `powershell -NoProfile -NonInteractive -Command "(Get-PfxCertificate \"${certPath}\").Thumbprint"`
  );
  return out.trim();
};

export const packOnWindows = async (): Promise<void> => {
  const rootPath = core.getInput('win_root_path');
  const intermediatePath = core.getInput('win_intermediate_path');
  const certPath = core.getInput('win_cert_path');

  // Optionally install provided certificates to the CurrentUser store
  await addCertToStore('ROOT', rootPath);
  await addCertToStore('CA', intermediatePath);
  await addCertToStore('MY', certPath);

  let certSha1 = core.getInput('win_kms_cert_sha1');
  if (!certSha1 && certPath) {
    certSha1 = await computeThumbprint(certPath);
    core.info(`Computed WIN_KMS_CERT_SHA1 from ${certPath}`);
  }

  await runElectronBuilder(`--x64 --ia32 --arm64 --win nsis msi`, {
    WIN_KMS_KEY_RESOURCE: core.getInput('win_kms_key_resource'),
    WIN_KMS_CERT_SHA1: certSha1,
    WIN_KMS_CSP: core.getInput('win_kms_csp'),
    WIN_TIMESTAMP_URL: core.getInput('win_timestamp_url'),
    WIN_KMS_CERT_STORE: 'MY',
    WIN_KMS_USE_LOCAL_MACHINE: 'false',
  });

  await runElectronBuilder(`--x64 --ia32 --arm64 --win appx`, {
    WIN_KMS_KEY_RESOURCE: core.getInput('win_kms_key_resource'),
    WIN_KMS_CERT_SHA1: certSha1,
    WIN_KMS_CSP: core.getInput('win_kms_csp'),
    WIN_TIMESTAMP_URL: core.getInput('win_timestamp_url'),
    WIN_KMS_CERT_STORE: 'MY',
    WIN_KMS_USE_LOCAL_MACHINE: 'false',
  });
};
