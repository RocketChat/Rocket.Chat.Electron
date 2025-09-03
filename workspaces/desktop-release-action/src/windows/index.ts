import * as core from '@actions/core';
import { runElectronBuilder } from '../shell';
import { setupCertificates } from './certificates';
import { setupGoogleCloudAuth, installGoogleCloudCLI, authenticateGcloud } from './google-cloud';
import { installKmsCngProvider } from './kms-provider';
import { findSigntool, installJsign } from './signing-tools';
import { signBuiltPackages } from './sign-packages';

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
    
    // Setup base environment variables
    const baseEnv = {
      WIN_KMS_KEY_RESOURCE: kmsKeyResource,
      WIN_CERT_FILE: userCertPath,
      GOOGLE_APPLICATION_CREDENTIALS: credentialsPath,
    };
    
    core.info('Building Windows packages WITHOUT signing...');
    core.info('Packages will be signed after build to avoid MSI/ICE issues');
    
    // Build all Windows packages WITHOUT signing
    // We'll sign them after build to avoid KMS CNG provider MSI installation
    // interfering with our MSI builds
    
    // Create electron-builder config that disables signing
    const buildConfig = {
      win: {
        forceCodeSigning: false,
        sign: false,
        signAndEditExecutable: false
      }
    };
    
    // Build NSIS installer (unsigned)
    core.info('Building NSIS installer (unsigned)...');
    await runElectronBuilder(`--x64 --win nsis`, {
      ...baseEnv,
      ELECTRON_BUILDER_CONFIG: JSON.stringify(buildConfig)
    });
    
    // Build MSI installer (unsigned)
    core.info('Building MSI installer (unsigned)...');
    await runElectronBuilder(`--x64 --ia32 --arm64 --win msi`, {
      ...baseEnv,
      ELECTRON_BUILDER_CONFIG: JSON.stringify(buildConfig)
    });
    
    // Build AppX package (unsigned)
    core.info('Building AppX package (unsigned)...');
    await runElectronBuilder(`--x64 --ia32 --arm64 --win appx`, {
      ...baseEnv,
      ELECTRON_BUILDER_CONFIG: JSON.stringify(buildConfig)
    });
    
    core.info('✅ All Windows packages built successfully (unsigned)');
    
    // NOW install KMS CNG provider and signing tools
    // This won't interfere with MSI builds since they're already done
    core.info('Setting up signing environment...');
    
    // Install Google Cloud KMS CNG provider
    await installKmsCngProvider();
    
    // Install jsign for Java-based signing
    await installJsign();
    
    // Install and configure Google Cloud CLI
    const gcloudPath = await installGoogleCloudCLI();
    
    // Authenticate gcloud with service account
    await authenticateGcloud(credentialsPath, gcloudPath);
    
    // Update environment with gcloud path for signing
    process.env.GCLOUD_PATH = gcloudPath;
    
    // Sign all the built packages
    core.info('Signing all built packages...');
    const distPath = process.cwd() + '/dist';
    await signBuiltPackages(distPath);
    
    core.info('✅ Windows packages built and signed successfully');
  } catch (error) {
    core.error(`Failed to build Windows packages: ${error}`);
    throw error;
  }
};