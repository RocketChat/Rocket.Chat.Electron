import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as path from 'path';
import * as glob from 'glob';
import { run } from '../shell';

/**
 * Sign all built Windows packages using jsign
 */
export const signBuiltPackages = async (distPath: string): Promise<void> => {
  core.info('Signing built Windows packages...');
  
  // Get signing configuration
  const kmsKeyResource = process.env.WIN_KMS_KEY_RESOURCE;
  const certFile = process.env.WIN_CERT_FILE;
  const gcloudBinPath = process.env.GCLOUD_PATH || 'C:\\ProgramData\\chocolatey\\lib\\gcloudsdk\\tools\\google-cloud-sdk\\bin';
  const gcloudCmd = `${gcloudBinPath}\\gcloud.cmd`;
  const jsignPath = 'C:\\ProgramData\\chocolatey\\lib\\jsign\\tools\\jsign.cmd';
  
  if (!kmsKeyResource || !certFile) {
    core.warning('Signing credentials not available, skipping package signing');
    return;
  }
  
  // Extract KMS configuration
  const resourceParts = kmsKeyResource.split('/');
  const projectId = resourceParts[1];
  const location = resourceParts[3];
  const keyRingName = resourceParts[5];
  const keyName = resourceParts[7]; // cryptoKeys/KEY_NAME
  
  // Get access token from gcloud
  core.info('Getting access token from gcloud...');
  let accessToken = '';
  await exec.exec(gcloudCmd, ['auth', 'print-access-token'], {
    listeners: {
      stdout: (data: Buffer) => {
        accessToken += data.toString();
      }
    },
    silent: true  // Don't show the token in logs
  });
  
  accessToken = accessToken.trim();
  
  if (!accessToken) {
    throw new Error('Failed to get access token from gcloud');
  }
  
  core.info(`Access token retrieved successfully (length: ${accessToken.length})`)
  
  // Find all packages to sign
  const patterns = [
    '**/*.exe',  // All executables (NSIS installers and unpacked apps)
    '**/*.msi',  // MSI installers
    '**/*.appx', // AppX packages
  ];
  
  const filesToSign: string[] = [];
  
  for (const pattern of patterns) {
    const files = glob.sync(pattern, {
      cwd: distPath,
      absolute: true,
      ignore: ['**/node_modules/**', '**/temp/**']
    });
    filesToSign.push(...files);
  }
  
  core.info(`Found ${filesToSign.length} files to sign`);
  
  // Sign each file
  for (const file of filesToSign) {
    const fileName = path.basename(file);
    
    // Skip already signed files (electron-builder may have partially signed some)
    // We'll re-sign everything to be safe
    
    core.info(`Signing ${fileName}...`);
    
    const jsignArgs = [
      '--storetype', 'GOOGLECLOUD',
      '--keystore', `projects/${projectId}/locations/${location}/keyRings/${keyRingName}`,
      '--storepass', accessToken,
      '--alias', keyName,
      '--certfile', certFile,
      '--tsaurl', 'http://timestamp.digicert.com',
      '--name', 'Rocket.Chat',
      '--url', 'https://rocket.chat',
      file
    ];
    
    try {
      // Log command without token
      core.info(`Running: jsign --storetype GOOGLECLOUD --keystore projects/${projectId}/locations/${location}/keyRings/${keyRingName} --storepass [MASKED] --alias ${keyName} --certfile ${certFile} --tsaurl http://timestamp.digicert.com ${fileName}`);
      
      // Execute signing
      await run(`cmd /c "${jsignPath}" ${jsignArgs.map(arg => {
        // Quote arguments with spaces
        if (arg.includes(' ') && !arg.startsWith('"')) return `"${arg}"`;
        return arg;
      }).join(' ')}`);
      
      core.info(`✓ Successfully signed ${fileName}`);
    } catch (error) {
      core.error(`Failed to sign ${fileName}: ${error}`);
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