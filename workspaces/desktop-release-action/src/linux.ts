import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import { promises as fsPromises } from 'fs';
import * as globCb from 'glob';
import { promisify } from 'util';

import { run, runElectronBuilder } from './shell';

// Promisify the glob function
const globPromise = promisify(globCb.glob);

export const setupSnapcraft = (): Promise<void> =>
  core.group('Setup Snapcraft', async () => {
    // Install snapcraft
    await run(`sudo snap install snapcraft --classic --channel stable`);
    
    // Setup credentials for snapcraft
    if (process.env.SNAPCRAFT_STORE_CREDENTIALS) {
      core.info('Setting up snapcraft credentials from SNAPCRAFT_STORE_CREDENTIALS');
      // Store credentials to a file
      const credentialsPath = path.join(process.env.HOME || '/tmp', 'snapcraft.credentials');
      await fsPromises.writeFile(credentialsPath, process.env.SNAPCRAFT_STORE_CREDENTIALS, { mode: 0o600 });
      
      // Login with snapcraft
      await run(`snapcraft login --with ${credentialsPath}`);
      
      // Remove credentials file after login
      await fsPromises.unlink(credentialsPath);
      
      core.info('Snapcraft login successful');
    } else if (process.env.SNAPCRAFT_TOKEN) {
      core.info('Setting up snapcraft with SNAPCRAFT_TOKEN');
      await run(`snapcraft login --with-token ${process.env.SNAPCRAFT_TOKEN}`);
      core.info('Snapcraft login successful');
    } else {
      core.warning('No snapcraft credentials found. Snap publishing will be skipped.');
    }
  });

// Function to ensure the sandbox script files are in place for packaged Linux distributions
export const prepareLinuxBuildFiles = async (): Promise<void> => {
  return core.group('Preparing Linux build files for sandbox permissions', async () => {
    try {
      // Run the prepare script for Linux builds
      await run('node build/scripts/prepare-linux-build.js');
      
      // Extra check to ensure the script ran correctly
      const appDir = path.join(process.cwd(), 'app');
      const files = [
        'appimage-launcher.sh',
        'set-permissions.sh',
        'README.txt'
      ];
      
      for (const file of files) {
        const filePath = path.join(appDir, file);
        if (!fs.existsSync(filePath)) {
          core.warning(`Expected file ${file} does not exist in the app directory. Build might not handle sandbox permissions correctly.`);
        } else {
          core.info(`Verified ${file} exists in app directory`);
          
          // Set executable permissions for shell scripts
          if (file.endsWith('.sh')) {
            await fsPromises.chmod(filePath, 0o755);
            core.info(`Set executable permissions for ${file}`);
          }
        }
      }
    } catch (error: unknown) {
      core.warning(`Failed to prepare Linux build files: ${error instanceof Error ? error.message : String(error)}`);
      // Don't fail the build, just warn
    }
  });
};

export const packOnLinux = async (): Promise<void> => {
  // First prepare the Linux build files to handle sandbox permissions
  await prepareLinuxBuildFiles();
  
  // Then run the electron builder with all Linux targets
  return runElectronBuilder(`--linux tar.gz deb rpm snap AppImage`);
};

const snapChannels = ['edge', 'beta', 'candidate', 'stable'] as const;

export const uploadSnap = async (
  snapFilePath: string,
  level: (typeof snapChannels)[number]
): Promise<void> => {
  const channels = snapChannels.slice(0, snapChannels.indexOf(level) + 1);

  for (const channel of channels) {
    await core.group(
      `uploading ${snapFilePath} to Snapcraft in channel ${channel}`,
      () => run(`snapcraft upload --release=${channel} "${snapFilePath}"`)
    );
  }
};

// Find and upload snap files with appropriate release level
export const findAndUploadSnaps = async (version?: string): Promise<void> => {
  // Skip if no snapcraft credentials
  if (!process.env.SNAPCRAFT_STORE_CREDENTIALS && !process.env.SNAPCRAFT_TOKEN) {
    core.info('Skipping snap upload - no snapcraft credentials available');
    return;
  }

  return core.group('Finding and uploading snap files', async () => {
    try {
      // Find all snap files in the dist directory
      const snapFiles = await globPromise('dist/*.snap');
      
      if (snapFiles.length === 0) {
        core.info('No snap files found in dist directory');
        return;
      }

      // Login to snapcraft if not already done
      await setupSnapcraft();
      
      // Determine release level based on version
      let releaseLevel: (typeof snapChannels)[number] = 'edge';
      
      if (version) {
        if (!version.includes('-')) {
          // No prerelease tag means stable
          releaseLevel = 'stable';
        } else if (version.includes('-candidate')) {
          releaseLevel = 'candidate';
        } else if (version.includes('-beta')) {
          releaseLevel = 'beta';
        }
      }
      
      core.info(`Determined release level: ${releaseLevel}`);
      
      // Upload each snap file
      for (const snapFile of snapFiles) {
        core.info(`Uploading snap file: ${snapFile}`);
        await uploadSnap(snapFile, releaseLevel);
      }
      
      core.info('Snap upload complete');
    } catch (error: unknown) {
      core.warning(`Failed to upload snap files: ${error instanceof Error ? error.message : String(error)}`);
      // Don't fail the build, just warn
    }
  });
};
