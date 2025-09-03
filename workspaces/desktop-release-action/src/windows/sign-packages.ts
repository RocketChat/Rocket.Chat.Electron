import * as core from '@actions/core';
import * as path from 'path';
import * as glob from 'glob';

/**
 * Sign all built Windows packages using the existing winSignKms.js
 */
export const signBuiltPackages = async (distPath: string): Promise<void> => {
  core.info('Signing built Windows packages...');
  
  // Check that required environment variables are set
  const kmsKeyResource = process.env.WIN_KMS_KEY_RESOURCE;
  const certFile = process.env.WIN_CERT_FILE;
  
  if (!kmsKeyResource || !certFile) {
    core.warning('Signing credentials not available, skipping package signing');
    return;
  }
  
  // Path to the winSignKms.js script
  const scriptPath = path.resolve(process.cwd(), 'build', 'winSignKms.js');
  core.info(`Using signing script: ${scriptPath}`);
  
  // Load the signing function
  const signWithGoogleKms = require(scriptPath);
  
  // Debug: Check what's in the dist directory
  core.info(`Looking for packages in: ${distPath}`);
  
  // List all files in dist to debug
  try {
    const allFiles = glob.sync('**/*', {
      cwd: distPath,
      absolute: false
    });
    core.info(`Files in dist directory: ${allFiles.length} total`);
    allFiles.filter(f => f.endsWith('.exe') || f.endsWith('.msi') || f.endsWith('.appx')).forEach(f => {
      core.info(`  - ${f}`);
    });
  } catch (e) {
    core.warning(`Could not list files: ${e}`);
  }
  
  // Find all packages to sign
  const patterns = [
    '*.exe',      // Executables in root of dist
    '*.msi',      // MSI installers in root of dist  
    '*.appx',     // AppX packages in root of dist
  ];
  
  const filesToSign: string[] = [];
  
  for (const pattern of patterns) {
    const files = glob.sync(pattern, {
      cwd: distPath,
      absolute: true,
      ignore: ['**/node_modules/**', '**/temp/**', '**/win-unpacked/**', '**/win-ia32-unpacked/**', '**/win-arm64-unpacked/**']
    });
    if (files.length > 0) {
      core.info(`Pattern '${pattern}' found ${files.length} files`);
    }
    filesToSign.push(...files);
  }
  
  // Remove duplicates
  const uniqueFiles = Array.from(new Set(filesToSign));
  
  core.info(`Found ${uniqueFiles.length} files to sign`);
  
  if (uniqueFiles.length === 0) {
    core.error(`No packages found to sign in ${distPath}`);
    core.error(`Current working directory: ${process.cwd()}`);
    throw new Error(`No Windows packages found to sign. Expected .exe, .msi, or .appx files in ${distPath}`);
  }
  
  // Sign each file using the existing winSignKms.js script
  for (const file of uniqueFiles) {
    core.info(`Signing ${path.basename(file)}...`);
    
    const config = {
      path: file,
      name: 'Rocket.Chat',
      site: 'https://rocket.chat'
    };
    
    try {
      await signWithGoogleKms(config);
      core.info(`✓ Successfully signed ${path.basename(file)}`);
    } catch (error) {
      core.error(`Failed to sign ${path.basename(file)}: ${error}`);
      throw error;
    }
  }
  
  core.info(`✅ All Windows packages signed successfully`);
};

/**
 * Find and sign specific package types
 */
export const signPackageType = async (
  distPath: string, 
  pattern: string,
  description: string
): Promise<void> => {
  core.info(`Signing ${description}...`);
  
  const files = glob.sync(pattern, {
    cwd: distPath,
    absolute: true
  });
  
  if (files.length === 0) {
    core.warning(`No ${description} found to sign`);
    return;
  }
  
  for (const file of files) {
    await signBuiltPackages(path.dirname(file));
  }
};