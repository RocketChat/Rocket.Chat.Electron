import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import { run, runAndBuffer } from '../shell';

export const addCertToStore = async (store: 'ROOT' | 'CA' | 'MY', certPath?: string, user: boolean = true): Promise<void> => {
  if (!certPath || !fs.existsSync(certPath)) {
    core.info(`Certificate file not found or not provided: ${certPath}`);
    return;
  }
  
  const userFlag = user ? '-user ' : '';
  core.info(`Installing certificate to ${store} store: ${certPath}`);
  await run(`certutil ${userFlag}-addstore "${store}" "${certPath}"`);
};

export const computeThumbprint = async (certPath: string): Promise<string> => {
  if (!fs.existsSync(certPath)) {
    throw new Error(`Certificate file not found: ${certPath}`);
  }
  
  const out = await runAndBuffer(
    `powershell -NoProfile -NonInteractive -Command "(Get-PfxCertificate \\"${certPath}\\").Thumbprint"`
  );
  return out.trim();
};

export const writeCertFromSecret = async (secretValue: string, fileName: string): Promise<string> => {
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

export const verifyCertificateInStore = async (certSha1: string): Promise<void> => {
  core.info('Verifying certificate installation...');
  const verifyCertCmd = `powershell -Command "Get-ChildItem -Path 'Cert:\\CurrentUser\\My' | Where-Object { $_.Thumbprint -eq '${certSha1}' } | Select-Object -First 1"`;
  const certCheck = await runAndBuffer(verifyCertCmd);
  
  if (!certCheck || certCheck.trim() === '') {
    throw new Error(`Certificate with thumbprint ${certSha1} not found in CurrentUser\\My store!`);
  }
  
  core.info(`✅ Certificate found in store with thumbprint: ${certSha1}`);
  
  // Check if certificate has private key (it shouldn't for KMS)
  const hasPrivateKeyCmd = `powershell -Command "(Get-ChildItem -Path 'Cert:\\CurrentUser\\My' | Where-Object { $_.Thumbprint -eq '${certSha1}' }).HasPrivateKey"`;
  const hasPrivateKey = await runAndBuffer(hasPrivateKeyCmd);
  
  if (hasPrivateKey.trim().toLowerCase() === 'true') {
    core.info('✅ Certificate reports having a private key');
  } else {
    core.info('⚠️ Certificate does NOT have a private key - this is expected for KMS');
  }
};

export const setupCertificates = async (): Promise<string> => {
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
  
  // Verify the certificate is properly installed
  await verifyCertificateInStore(certSha1);
  
  return userCertPath;
};