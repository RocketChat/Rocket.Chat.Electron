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
  core.info('Installing Google Cloud CLI...');
  await exec.exec('choco', ['install', 'gcloudsdk', '-y']);
  
  // Refresh environment variables to pick up PATH changes
  await exec.exec('refreshenv');
  
  // Also manually add gcloud to PATH for this session
  const gcloudPath = 'C:\\ProgramData\\chocolatey\\lib\\gcloudsdk\\tools\\google-cloud-sdk\\bin';
  core.addPath(gcloudPath);
  process.env.PATH = `${gcloudPath};${process.env.PATH}`;
  
  // Find Python installation for gcloud
  core.info('Locating Python installation...');
  const pythonPaths = [
    'C:\\hostedtoolcache\\windows\\Python\\*\\x64\\python.exe',
    'C:\\Python*\\python.exe',
    'C:\\Program Files\\Python*\\python.exe',
    `${process.env.LOCALAPPDATA}\\Programs\\Python\\Python*\\python.exe`
  ];
  
  let pythonExe: string | null = null;
  for (const pythonPath of pythonPaths) {
    const findCmd = `powershell -Command "Get-ChildItem '${pythonPath}' -ErrorAction SilentlyContinue | Select-Object -First 1 | Select-Object -ExpandProperty FullName"`;
    const found = await runAndBuffer(findCmd).catch(() => '');
    if (found && found.trim()) {
      pythonExe = found.trim();
      break;
    }
  }
  
  if (!pythonExe) {
    throw new Error('Python not found in expected locations');
  }
  
  core.info(`Found Python at: ${pythonExe}`);
  core.exportVariable('CLOUDSDK_PYTHON', pythonExe);
  
  // Verify gcloud is accessible
  core.info('Verifying gcloud installation...');
  await exec.exec(`${gcloudPath}\\gcloud.cmd`, ['version']);
  
  return gcloudPath;
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