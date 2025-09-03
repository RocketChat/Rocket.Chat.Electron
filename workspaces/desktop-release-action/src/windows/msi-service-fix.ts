import * as core from '@actions/core';
import { run } from '../shell';

/**
 * Fix Windows Installer service to prevent MSI build errors
 * This resolves the common "LGHT0217" error when building MSI packages
 */
export const fixWindowsInstallerService = async (): Promise<void> => {
  core.info('Fixing Windows Installer service for MSI builds...');
  
  try {
    // Re-register Windows Installer service
    await run('msiexec /unregister');
    await run('msiexec /regserver');
    
    // Ensure the service is running
    await run('powershell -Command "Start-Service msiserver -ErrorAction SilentlyContinue"');
    
    core.info('Windows Installer service fixed successfully');
  } catch (error) {
    core.warning(`Failed to fix Windows Installer service: ${error}`);
    // Don't fail the build if this fix doesn't work
  }
};