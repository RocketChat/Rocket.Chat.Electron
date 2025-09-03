import * as core from '@actions/core';
import * as path from 'path';
import * as fs from 'fs';
import { run } from '../shell';

export const installKmsCngProvider = async (): Promise<void> => {
  const workspaceDir = process.env.GITHUB_WORKSPACE || process.cwd();
  const scriptPath = path.join(workspaceDir, 'build', 'install-kms-cng-provider.ps1');
  
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`KMS CNG provider installation script not found at: ${scriptPath}`);
  }
  
  core.info('Installing Google Cloud KMS CNG provider...');
  
  // The install script handles caching internally, so we just need to run it
  await run(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`);
  
  core.info('Google Cloud KMS CNG provider setup completed');
};