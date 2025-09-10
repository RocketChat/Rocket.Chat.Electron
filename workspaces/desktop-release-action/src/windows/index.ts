import * as path from 'path';
import * as core from '@actions/core';
import { runElectronBuilder } from '../shell';
import { setupCertificates } from './certificates';
import { setupGoogleCloudAuth, installGoogleCloudCLI, authenticateGcloud } from './google-cloud';
import { installKmsCngProvider } from './kms-provider';
import { findSigntool, installJsign } from './signing-tools';
import { signBuiltPackages } from './sign-packages';

export const packOnWindows = async (): Promise<void> => {
  try {
    const hasKmsKey = !!core.getInput('win_kms_key_resource') || !!process.env.WIN_KMS_KEY_RESOURCE;
    const hasGcpSa = !!core.getInput('gcp_sa_json') || !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const hasCert = !!core.getInput('win_user_crt') || !!core.getInput('win_kms_cert_sha1') || !!process.env.WIN_CERT_FILE;
    const shouldSign = hasKmsKey && hasGcpSa && hasCert;

    // Always build first. If we don't have signing secrets (typical in PRs),
    // we only build unsigned and stop there.

    // Ensure signtool (required by electron-builder on Windows toolchain)
    await findSigntool();

    if (!shouldSign) {
      core.info('No signing credentials detected. Performing unsigned Windows build (PR-safe).');
      await runElectronBuilder(`--x64 --ia32 --arm64 --win nsis msi appx`);
      core.info('✅ Windows packages built (unsigned).');
      return;
    }

    // Secrets are available: prepare environment and perform post-build signing
    const credentialsPath = await setupGoogleCloudAuth();
    const userCertPath = await setupCertificates();
    const kmsKeyResource = core.getInput('win_kms_key_resource') || process.env.WIN_KMS_KEY_RESOURCE!;

    const buildEnv = {
      // Intentionally blank to force electron-builder to skip inline signing
      WIN_KMS_KEY_RESOURCE: '',
      WIN_CERT_FILE: '',
    } as Record<string, string>;

    core.info('Building Windows packages WITHOUT signing (will sign after build)...');
    await runElectronBuilder(`--x64 --ia32 --arm64 --win nsis msi appx`, buildEnv);
    core.info('✅ Windows packages built (unsigned). Proceeding with signing...');

    await installKmsCngProvider();
    await installJsign();
    const gcloudPath = await installGoogleCloudCLI();
    await authenticateGcloud(credentialsPath, gcloudPath);

    process.env.WIN_KMS_KEY_RESOURCE = kmsKeyResource;
    process.env.WIN_CERT_FILE = userCertPath;
    process.env.GCLOUD_PATH = gcloudPath;
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;

    const distPath = path.resolve(process.cwd(), 'dist');
    await signBuiltPackages(distPath);
    core.info('✅ Windows packages built and signed successfully');
  } catch (error) {
    core.error(`Failed to build Windows packages: ${error}`);
    throw error;
  }
};