import * as core from '@actions/core';
import { runElectronBuilder } from '../shell';
import { setupCertificates } from './certificates';
import { setupGoogleCloudAuth, installGoogleCloudCLI, authenticateGcloud } from './google-cloud';
import { installKmsCngProvider } from './kms-provider';
import { findSigntool, installJsign } from './signing-tools';

export const packOnWindows = async (): Promise<void> => {
  try {
    // Find and setup signtool
    await findSigntool();
    
    // Setup Google Cloud authentication
    const credentialsPath = await setupGoogleCloudAuth();
    
    // Install Google Cloud KMS CNG provider
    await installKmsCngProvider();
    
    // Install jsign for Java-based signing
    await installJsign();
    
    // Install and configure Google Cloud CLI
    const gcloudPath = await installGoogleCloudCLI();
    
    // Authenticate gcloud with service account
    await authenticateGcloud(credentialsPath, gcloudPath);
    
    // Setup certificates and get the user certificate path
    const userCertPath = await setupCertificates();
    
    // Get KMS key resource
    const kmsKeyResource = core.getInput('win_kms_key_resource');
    if (!kmsKeyResource) {
      throw new Error('win_kms_key_resource input is required');
    }
    
    // Setup environment variables for electron-builder
    const env = {
      WIN_KMS_KEY_RESOURCE: kmsKeyResource,
      WIN_CERT_FILE: userCertPath,
      GOOGLE_APPLICATION_CREDENTIALS: credentialsPath,
      // Ensure jsign and gcloud are in PATH
      PATH: `C:/ProgramData/chocolatey/lib/jsign/tools;${gcloudPath};${process.env.PATH}`
    };
    
    core.info('Building Windows packages with Google Cloud KMS signing...');
    
    // Build NSIS installer
    await runElectronBuilder(`--x64 --win nsis`, env);
    
    // Build MSI installer
    await runElectronBuilder(`--x64 --ia32 --arm64 --win msi`, env);
    
    // Build AppX package
    await runElectronBuilder(`--x64 --ia32 --arm64 --win appx`, env);
    
    core.info('✅ Windows packages built successfully');
  } catch (error) {
    core.error(`Failed to build Windows packages: ${error}`);
    throw error;
  }
};