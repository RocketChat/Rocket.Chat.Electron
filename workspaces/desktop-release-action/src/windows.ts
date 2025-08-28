import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';

import { run, runAndBuffer, runElectronBuilder } from './shell';

const addCertToStore = async (store: 'ROOT' | 'CA' | 'MY', certPath?: string, user: boolean = true) => {
  if (!certPath || !fs.existsSync(certPath)) {
    core.info(`Certificate file not found or not provided: ${certPath}`);
    return;
  }
  
  const userFlag = user ? '-user ' : '';
  core.info(`Installing certificate to ${store} store: ${certPath}`);
  await run(`certutil ${userFlag}-addstore "${store}" "${certPath}"`);
};

const computeThumbprint = async (certPath: string): Promise<string> => {
  if (!fs.existsSync(certPath)) {
    throw new Error(`Certificate file not found: ${certPath}`);
  }
  
  const out = await runAndBuffer(
    `powershell -NoProfile -NonInteractive -Command "(Get-PfxCertificate \\"${certPath}\\").Thumbprint"`
  );
  return out.trim();
};

const writeCertFromSecret = async (secretValue: string, fileName: string): Promise<string> => {
  if (!secretValue) return '';
  
  const tempDir = process.env.RUNNER_TEMP || process.env.TEMP || '.';
  const certDir = path.join(tempDir, 'codesigning');
  const certPath = path.join(certDir, fileName);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
  }
  
  // Write certificate file
  fs.writeFileSync(certPath, secretValue, 'utf8');
  core.info(`Certificate written to: ${certPath}`);
  return certPath;
};

const setupGoogleCloudAuth = async () => {
  const gcpSaJson = core.getInput('gcp_sa_json');
  if (!gcpSaJson) {
    throw new Error('gcp_sa_json input is required for Google Cloud KMS authentication');
  }
  
  const tempDir = process.env.RUNNER_TEMP || process.env.TEMP || '.';
  const credentialsPath = path.join(tempDir, 'gcp-sa.json');
  
  fs.writeFileSync(credentialsPath, gcpSaJson, 'utf8');
  core.exportVariable('GOOGLE_APPLICATION_CREDENTIALS', credentialsPath);
  core.info(`Google Cloud credentials configured: ${credentialsPath}`);
};

const installKmsCngProvider = async () => {
  core.info('Installing Google Cloud KMS CNG provider...');
  const workspaceDir = process.env.GITHUB_WORKSPACE || process.cwd();
  const scriptPath = path.join(workspaceDir, 'build', 'install-kms-cng-provider.ps1');
  
  // Use caching - no need to force download, let the script handle cache logic
  await run(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`);
  core.info('Google Cloud KMS CNG provider setup completed');
};

export const packOnWindows = async (): Promise<void> => {
  // Setup Google Cloud authentication
  await setupGoogleCloudAuth();
  
  // Install Google Cloud KMS CNG provider
  await installKmsCngProvider();
  
  // Write certificates from secrets to temporary files
  const userCertPath = await writeCertFromSecret(core.getInput('win_user_crt'), 'user.crt');
  const intermediateCertPath = await writeCertFromSecret(core.getInput('win_intermediate_crt'), 'intermediate.crt');
  const rootCertPath = await writeCertFromSecret(core.getInput('win_root_crt'), 'root.crt');
  
  // Install certificates to Windows certificate stores (CurrentUser)
  await addCertToStore('ROOT', rootCertPath);
  await addCertToStore('CA', intermediateCertPath);
  await addCertToStore('MY', userCertPath);
  
  // Compute certificate thumbprint if not provided
  let certSha1 = core.getInput('win_kms_cert_sha1');
  if (!certSha1 && userCertPath) {
    certSha1 = await computeThumbprint(userCertPath);
    core.info(`Computed certificate thumbprint: ${certSha1}`);
  }
  
  if (!certSha1) {
    throw new Error('Could not determine certificate thumbprint. Provide win_kms_cert_sha1 or win_user_crt input.');
  }
  
  const kmsKeyResource = core.getInput('win_kms_key_resource');
  if (!kmsKeyResource) {
    throw new Error('win_kms_key_resource input is required');
  }
  
  const env = {
    WIN_KMS_KEY_RESOURCE: kmsKeyResource,
    WIN_KMS_CERT_SHA1: certSha1,
    WIN_KMS_CSP: core.getInput('win_kms_csp') || 'Google Cloud KMS Provider',
    WIN_TIMESTAMP_URL: core.getInput('win_timestamp_url') || 'http://timestamp.digicert.com',
    WIN_KMS_CERT_STORE: 'MY',
    WIN_KMS_USE_LOCAL_MACHINE: 'false',
  };
  
  core.info('Building Windows packages with Google Cloud KMS signing...');
  
  await runElectronBuilder(`--x64 --ia32 --arm64 --win nsis msi`, env);
  await runElectronBuilder(`--x64 --ia32 --arm64 --win appx`, env);
};