import * as core from '@actions/core';
import * as path from 'path';
import * as glob from 'glob';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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
  // We need to execute it as node script with the config as a JSON argument
  for (const file of uniqueFiles) {
    core.info(`Signing ${path.basename(file)}...`);
    
    // Create a temporary script that calls winSignKms.js
    const scriptContent = `
      const sign = require('./build/winSignKms.js');
      const config = {
        path: '${file.replace(/\\/g, '\\\\')}',
        name: 'Rocket.Chat',
        site: 'https://rocket.chat'
      };
      
      sign(config).then(() => {
        console.log('Successfully signed');
        process.exit(0);
      }).catch(err => {
        console.error('Signing failed:', err);
        process.exit(1);
      });
    `;
    
    try {
      // Execute the script using node
      const { stdout, stderr } = await execAsync(
        `node -e "${scriptContent.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`,
        {
          cwd: process.cwd(),
          env: {
            ...process.env,
            WIN_KMS_KEY_RESOURCE: kmsKeyResource,
            WIN_CERT_FILE: certFile,
            GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS,
            CLOUDSDK_PYTHON: process.env.CLOUDSDK_PYTHON,
          },
          maxBuffer: 10 * 1024 * 1024 // 10MB buffer for output
        }
      );
      
      if (stdout) core.info(stdout);
      if (stderr) core.warning(stderr);
      
      core.info(`✓ Successfully signed ${path.basename(file)}`);
    } catch (error: any) {
      core.error(`Failed to sign ${path.basename(file)}: ${error.message}`);
      if (error.stdout) core.error(`stdout: ${error.stdout}`);
      if (error.stderr) core.error(`stderr: ${error.stderr}`);
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