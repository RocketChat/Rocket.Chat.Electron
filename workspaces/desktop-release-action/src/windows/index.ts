import * as path from 'path';
import * as core from '@actions/core';
import { runElectronBuilder } from '../shell';
import { setupCertificates } from './certificates';
import {
  setupGoogleCloudAuth,
  installGoogleCloudCLI,
  authenticateGcloud,
} from './google-cloud';
import { installKmsCngProvider } from './kms-provider';
import { findSigntool, installJsign } from './signing-tools';
import { signBuiltPackages } from './sign-packages';
import { updateYamlChecksums } from './update-yaml-checksums';
import {
  verifyExecutableSignature,
  verifyInstallerSignatures,
} from './verify-signature';

export const packOnWindows = async (): Promise<void> => {
  try {
    // Find and setup signtool
    await findSigntool();

    // Setup Google Cloud authentication
    const credentialsPath = await setupGoogleCloudAuth();

    // Setup certificates and get the user certificate path
    const userCertPath = await setupCertificates();

    // Get KMS key resource
    const kmsKeyResource = core.getInput('win_kms_key_resource');
    if (!kmsKeyResource) {
      throw new Error('win_kms_key_resource input is required');
    }

    // Install signing tools BEFORE building so electron-builder can sign
    core.info('Setting up signing environment before build...');

    // Install jsign for Java-based signing (doesn't require KMS CNG provider)
    await installJsign();

    // Install and configure Google Cloud CLI
    const gcloudPath = await installGoogleCloudCLI();

    // Authenticate gcloud with service account
    await authenticateGcloud(credentialsPath, gcloudPath);

    // Setup environment variables for electron-builder's signing via winSignKms.js
    // Build flow: afterPack (apply fuses) -> sign via winSignKms.js -> package
    const buildEnv = {
      WIN_KMS_KEY_RESOURCE: kmsKeyResource,
      WIN_CERT_FILE: userCertPath,
      GOOGLE_APPLICATION_CREDENTIALS: credentialsPath,
      GCLOUD_PATH: gcloudPath,
    };

    // Set process.env so electron-builder's signing can access credentials
    process.env.WIN_KMS_KEY_RESOURCE = kmsKeyResource;
    process.env.WIN_CERT_FILE = userCertPath;
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
    process.env.GCLOUD_PATH = gcloudPath;

    core.info('Building Windows packages...');
    core.info(
      'Executables will be signed by electron-builder via winSignKms.js'
    );

    core.info('Building NSIS installer...');
    await runElectronBuilder(`--x64 --ia32 --arm64 --win nsis`, buildEnv);

    core.info('Building MSI installer...');
    await runElectronBuilder(`--x64 --ia32 --arm64 --win msi`, buildEnv);

    core.info('Building AppX package...');
    await runElectronBuilder(`--x64 --ia32 --arm64 --win appx`, buildEnv);

    core.info('✅ All Windows packages built successfully');

    const distPath = path.resolve(process.cwd(), 'dist');

    core.info('Verifying executable signatures...');
    await verifyExecutableSignature(distPath);

    core.info('Installing KMS CNG provider for installer signing...');
    await installKmsCngProvider();

    core.info('Signing installer packages...');
    await signBuiltPackages(distPath);

    core.info('Verifying installer signatures...');
    await verifyInstallerSignatures(distPath);

    core.info('Updating latest.yml with correct checksums...');
    await updateYamlChecksums(distPath);

    core.info('✅ Windows packages built, signed, and verified successfully');
  } catch (error) {
    core.error(`Failed to build Windows packages: ${error}`);
    throw error;
  }
};
