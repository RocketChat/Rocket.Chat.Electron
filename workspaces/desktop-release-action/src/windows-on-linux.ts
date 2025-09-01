import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import { run, runElectronBuilder } from './shell';

/**
 * Build Windows packages on Linux using osslsigncode with Google Cloud KMS
 * This avoids Windows KMS compatibility issues by using Linux's better PKCS#11 support
 */

const setupOsslSignCode = async () => {
  core.info('Installing osslsigncode and dependencies...');
  await run('sudo apt-get update');
  await run('sudo apt-get install -y osslsigncode libengine-pkcs11-openssl opensc wget wine64');
};

const installLibKmsp11 = async () => {
  core.info('Installing Google Cloud KMS PKCS#11 library...');
  const version = '1.7';
  const url = `https://github.com/GoogleCloudPlatform/kms-integrations/releases/download/pkcs11-v${version}/libkmsp11-${version}-linux-amd64.tar.gz`;
  
  await run(`wget -q -O /tmp/libkmsp11.tar.gz ${url}`);
  await run('sudo mkdir -p /opt/libkmsp11');
  await run('sudo tar -xzf /tmp/libkmsp11.tar.gz -C /opt/libkmsp11 --strip-components=1');
  await run('sudo chmod 755 /opt/libkmsp11/libkmsp11.so');
  
  core.info('libkmsp11 installed successfully');
};

const setupCertificates = async (): Promise<string> => {
  const tempDir = process.env.RUNNER_TEMP || '/tmp';
  const certDir = path.join(tempDir, 'certs');
  
  if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
  }
  
  // Build certificate chain file
  const userCrt = core.getInput('win_user_crt');
  if (!userCrt) {
    throw new Error('win_user_crt is required for Linux-based Windows signing');
  }
  
  let certChain = userCrt;
  
  const intermediateCrt = core.getInput('win_intermediate_crt');
  if (intermediateCrt) {
    certChain += '\n' + intermediateCrt;
  }
  
  const rootCrt = core.getInput('win_root_crt');
  if (rootCrt) {
    certChain += '\n' + rootCrt;
  }
  
  const certFile = path.join(certDir, 'user.crt');
  fs.writeFileSync(certFile, certChain, 'utf8');
  core.info(`Certificate chain written to: ${certFile}`);
  
  return certFile;
};

const setupKmsPkcs11Config = async (): Promise<string> => {
  const tempDir = process.env.RUNNER_TEMP || '/tmp';
  const configPath = path.join(tempDir, 'kms_pkcs11_config.yaml');
  
  const kmsKeyResource = core.getInput('win_kms_key_resource');
  if (!kmsKeyResource) {
    throw new Error('win_kms_key_resource is required');
  }
  
  // Extract key ring from the full resource path
  // Format: projects/PROJECT/locations/LOCATION/keyRings/RING/cryptoKeys/KEY/cryptoKeyVersions/VERSION
  const keyRingMatch = kmsKeyResource.match(/^(projects\/[^\/]+\/locations\/[^\/]+\/keyRings\/[^\/]+)/);
  if (!keyRingMatch) {
    throw new Error('Invalid KMS key resource format');
  }
  const keyRing = keyRingMatch[1];
  
  const config = `---
tokens:
  - key_ring: ${keyRing}
`;
  
  fs.writeFileSync(configPath, config, 'utf8');
  core.info(`KMS PKCS#11 config written to: ${configPath}`);
  
  return configPath;
};

const setupGoogleCloudAuth = async () => {
  const gcpSaJson = core.getInput('gcp_sa_json');
  if (!gcpSaJson) {
    throw new Error('gcp_sa_json is required for Google Cloud KMS authentication');
  }
  
  const tempDir = process.env.RUNNER_TEMP || '/tmp';
  const credentialsPath = path.join(tempDir, 'gcp-sa.json');
  
  fs.writeFileSync(credentialsPath, gcpSaJson, 'utf8');
  core.exportVariable('GOOGLE_APPLICATION_CREDENTIALS', credentialsPath);
  core.info(`Google Cloud credentials configured: ${credentialsPath}`);
};

export const packWindowsOnLinux = async (): Promise<void> => {
  core.info('Building Windows packages on Linux with Google Cloud KMS signing...');
  
  // Install required tools
  await setupOsslSignCode();
  await installLibKmsp11();
  
  // Setup Google Cloud authentication
  await setupGoogleCloudAuth();
  
  // Setup certificates
  const certFile = await setupCertificates();
  
  // Setup KMS PKCS#11 configuration
  const kmsPkcs11Config = await setupKmsPkcs11Config();
  
  // Set environment variables for signing
  const env = {
    GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
    PKCS11_MODULE_PATH: '/opt/libkmsp11/libkmsp11.so',
    KMS_PKCS11_CONFIG: kmsPkcs11Config,
    WIN_KMS_KEY_RESOURCE: core.getInput('win_kms_key_resource'),
    WIN_CERT_FILE: certFile,
  };
  
  core.info('Building Windows x64, ia32, and arm64 packages...');
  
  // Build NSIS and MSI installers
  await runElectronBuilder(`--win nsis msi --x64 --ia32 --arm64`, env);
  
  // Build AppX packages
  await runElectronBuilder(`--win appx --x64 --ia32 --arm64`, env);
  
  core.info('Windows packages built successfully on Linux');
};