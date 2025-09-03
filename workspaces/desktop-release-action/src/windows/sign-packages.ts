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
  // Format: projects/PROJECT/locations/LOCATION/keyRings/RING/cryptoKeys/KEY/cryptoKeyVersions/VERSION
  // But sometimes the cryptoKeys/KEY part is missing, so we need to handle that
  const resourceParts = kmsKeyResource.split('/');
  
  // Extract key alias (same logic as winSignKms.js)
  function extractKeyAlias(resource: string): string {
    const parts = resource.split('/');
    if (parts.length >= 6 && parts[4] === 'cryptoKeys') {
      return parts[5];
    }
    // Fallback to default key name if we can't parse
    return 'Electron_Desktop_App_Key';
  }
  
  const projectId = resourceParts[1];
  const location = resourceParts[3];
  const keyRingName = resourceParts[5];
  const keyName = extractKeyAlias(kmsKeyResource);
  
  core.info(`Using project: ${projectId}`);
  core.info(`Using location: ${location}`);
  core.info(`Using keyring: ${keyRingName}`);
  core.info(`Using key: ${keyName}`)
  
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
    '**/*.exe',   // All executables (including subdirectories)
    '**/*.msi',   // MSI installers (including subdirectories)
    '**/*.appx',  // AppX packages (including subdirectories)
  ];
  
  const filesToSign: string[] = [];
  
  for (const pattern of patterns) {
    const files = glob.sync(pattern, {
      cwd: distPath,
      absolute: true,
      ignore: ['**/node_modules/**', '**/temp/**', '**/win-unpacked/**']
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
  
  // Sign each file
  for (const file of uniqueFiles) {
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
        if (arg && typeof arg === 'string' && arg.includes(' ') && !arg.startsWith('"')) {
          return `"${arg}"`;
        }
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