import * as path from 'path';
import * as core from '@actions/core';
import { runElectronBuilder } from '../shell';
import { setupCertificates } from './certificates';
import { setupGoogleCloudAuth, installGoogleCloudCLI, authenticateGcloud } from './google-cloud';
import { installKmsCngProvider } from './kms-provider';
import { findSigntool, installJsign } from './signing-tools';
import { signBuiltPackages } from './sign-packages';
import { updateYamlChecksums } from './update-yaml-checksums';

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
    
    // Install signing tools BEFORE building so afterPack hook can use them
    core.info('Setting up signing environment before build...');
    
    // Install jsign for Java-based signing (doesn't require KMS CNG provider)
    await installJsign();
    
    // Install and configure Google Cloud CLI
    const gcloudPath = await installGoogleCloudCLI();
    
    // Authenticate gcloud with service account
    await authenticateGcloud(credentialsPath, gcloudPath);
    
    // Setup environment variables for afterPack hook to sign executables
    // afterPack will use jsign to sign Rocket.Chat.exe during build
    const buildEnv = {
      WIN_KMS_KEY_RESOURCE: kmsKeyResource,
      WIN_CERT_FILE: userCertPath,
      GOOGLE_APPLICATION_CREDENTIALS: credentialsPath,
      GCLOUD_PATH: gcloudPath,
    };
    
    // Set process.env so afterPack hook can access signing credentials
    process.env.WIN_KMS_KEY_RESOURCE = kmsKeyResource;
    process.env.WIN_CERT_FILE = userCertPath;
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
    process.env.GCLOUD_PATH = gcloudPath;
    
    core.info('Building Windows packages...');
    core.info('Executables will be signed via afterPack hook using jsign');
    
    // Build NSIS installer (Rocket.Chat.exe will be signed in afterPack hook)
    core.info('Building NSIS installer...');
    await runElectronBuilder(`--x64 --ia32 --arm64 --win nsis`, buildEnv);
    
    // Build MSI installer (Rocket.Chat.exe will be signed in afterPack hook)
    core.info('Building MSI installer...');
    await runElectronBuilder(`--x64 --ia32 --arm64 --win msi`, buildEnv);
    
    // Build AppX package (Rocket.Chat.exe will be signed in afterPack hook)
    core.info('Building AppX package...');
    await runElectronBuilder(`--x64 --ia32 --arm64 --win appx`, buildEnv);
    
    core.info('✅ All Windows packages built successfully');
    
    // Install KMS CNG provider for signing final installer packages
    // This is safe to do after MSI builds are complete
    core.info('Installing KMS CNG provider for installer signing...');
    await installKmsCngProvider();
    
    // Sign all the built installer packages (.exe setup files, .msi)
    // The Rocket.Chat.exe inside is already signed via afterPack hook
    core.info('Signing installer packages...');
    const distPath = path.resolve(process.cwd(), 'dist');
    await signBuiltPackages(distPath);
    
    // Update latest.yml with correct checksums after signing
    core.info('Updating latest.yml with correct checksums...');
    await updateYamlChecksums(distPath);
    
    core.info('✅ Windows packages built and signed successfully');
  } catch (error) {
    core.error(`Failed to build Windows packages: ${error}`);
    throw error;
  }
};