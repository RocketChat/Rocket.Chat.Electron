import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as fs from 'fs';
import * as path from 'path';
import { runAndBuffer } from '../shell';

export const setupGoogleCloudAuth = async (): Promise<string> => {
  // Set up from action input
  const gcpSaJson = core.getInput('gcp_sa_json');
  if (!gcpSaJson) {
    throw new Error('gcp_sa_json input is required for Google Cloud KMS authentication');
  }
  
  const tempDir = process.env.RUNNER_TEMP || process.env.TEMP || '.';
  const credentialsPath = path.join(tempDir, 'gcp-sa.json');
  
  fs.writeFileSync(credentialsPath, gcpSaJson, 'utf8');
  core.exportVariable('GOOGLE_APPLICATION_CREDENTIALS', credentialsPath);
  core.info(`Google Cloud credentials configured: ${credentialsPath}`);
  return credentialsPath;
};

export const installGoogleCloudCLI = async (): Promise<string> => {
  core.info('Checking for preinstalled gcloud (via setup-gcloud)...');
  try {
    await exec.exec('gcloud', ['--version']);
    const whereOut = await runAndBuffer('where gcloud').catch(() => '');
    const bin = whereOut?.split(/\r?\n/).find(Boolean)?.trim();
    if (bin) {
      const dir = path.dirname(bin);
      core.addPath(dir);
      process.env.PATH = `${dir};${process.env.PATH}`;
      return dir;
    }
  } catch {
    // not present; rely on workflow to set up gcloud
  }

  throw new Error('gcloud not found. Use google-github-actions/setup-gcloud before invoking this action.');
};

export const authenticateGcloud = async (credentialsPath: string, gcloudPath: string): Promise<void> => {
  core.info('Authenticating with Google Cloud...');
  
  await exec.exec(`${gcloudPath}\\gcloud.cmd`, ['auth', 'activate-service-account', `--key-file=${credentialsPath}`]);
  
  // Set project from service account file
  const projectData = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  const projectId = projectData.project_id;
  core.info(`Setting project to: ${projectId}`);
  await exec.exec(`${gcloudPath}\\gcloud.cmd`, ['config', 'set', 'project', projectId]);
  
  // Verify authentication is working
  core.info('Verifying gcloud authentication...');
  await exec.exec(`${gcloudPath}\\gcloud.cmd`, ['auth', 'print-access-token']);
  core.info('✅ Google Cloud authentication successful');
};