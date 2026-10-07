import * as path from 'path';

import * as core from '@actions/core';

import { setupCertificates } from './certificates';
import {
  setupGoogleCloudAuth,
  installGoogleCloudCLI,
  authenticateGcloud,
} from './google-cloud';
import { installKmsCngProvider } from './kms-provider';
import { signBuiltPackages } from './sign-packages';
import { findSigntool, installJsign } from './signing-tools';
import { updateYamlChecksums } from './update-yaml-checksums';
import {
  verifyExecutableSignature,
  verifyInstallerSignatures,
} from './verify-signature';
import { runElectronBuilder } from '../shell';

export const packOnWindows = async (targets = ''): Promise<void> => {
  const targetList = targets ? targets.split(/\s+/) : ['nsis', 'msi', 'appx'];
  const buildsInstallers =
    targetList.includes('nsis') || targetList.includes('msi');
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

    // One electron-builder invocation per target keeps the per-target
    // failure isolation of the original sequential flow; a job that is
    // given a single target (the split workflow) runs exactly one.
    for (const target of targetList) {
      core.info(`Building ${target} package...`);
      await runElectronBuilder(
        `--x64 --ia32 --arm64 --win ${target}`,
        buildEnv
      );
    }

    core.info('✅ All Windows packages built successfully');

    const distPath = path.resolve(process.cwd(), 'dist');

    core.info('Verifying executable signatures...');
    await verifyExecutableSignature(distPath);

    if (buildsInstallers) {
      // AppX is Store-signed; jsign/KMS only applies to nsis exe and msi.
      core.info('Installing KMS CNG provider for installer signing...');
      await installKmsCngProvider();

      core.info('Signing installer packages...');
      await signBuiltPackages(distPath);

      core.info('Verifying installer signatures...');
      await verifyInstallerSignatures(distPath);
    } else {
      core.info('No nsis/msi targets in this job, skipping installer signing');
    }

    if (targetList.includes('nsis')) {
      core.info('Updating latest.yml with correct checksums...');
      await updateYamlChecksums(distPath);
    }

    core.info('✅ Windows packages built, signed, and verified successfully');
  } catch (error) {
    core.error(`Failed to build Windows packages: ${error}`);
    throw error;
  }
};
