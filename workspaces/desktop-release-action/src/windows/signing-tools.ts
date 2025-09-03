import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as fs from 'fs';
import * as path from 'path';
import { runAndBuffer } from '../shell';

export const findSigntool = async (): Promise<void> => {
  core.info('Searching for signtool.exe in Windows SDK...');
  const sdkPath = `${process.env['ProgramFiles(x86)']}\\Windows Kits\\10\\bin`;
  
  if (!fs.existsSync(sdkPath)) {
    throw new Error('Windows SDK path not found');
  }
  
  // Find signtool.exe in the SDK
  const findSigntoolCmd = `powershell -Command "Get-ChildItem -Path '${sdkPath}' -Include 'signtool.exe' -Recurse -ErrorAction SilentlyContinue | Sort-Object { $_.Directory.Name } -Descending | Select-Object -First 1 | Select-Object -ExpandProperty FullName"`;
  const signtoolPath = await runAndBuffer(findSigntoolCmd);
  
  if (!signtoolPath || signtoolPath.trim() === '') {
    throw new Error('signtool.exe not found in Windows SDK');
  }
  
  const binPath = path.dirname(signtoolPath.trim());
  core.info(`✅ Found signtool.exe at: ${signtoolPath.trim()}`);
  
  // Add to PATH
  core.addPath(binPath);
  process.env.PATH = `${binPath};${process.env.PATH}`;
  
  // Store the full path for electron-builder
  core.exportVariable('SIGNTOOL_PATH', signtoolPath.trim());
};

export const installJsign = async (): Promise<void> => {
  core.info('Installing OpenJDK 11...');
  await exec.exec('choco', ['install', 'openjdk11', '-y']);
  
  // Refresh environment to pick up Java
  await exec.exec('refreshenv');
  
  // Verify Java installation and add to PATH
  const javaHomeCmd = `powershell -Command "[System.Environment]::GetEnvironmentVariable('JAVA_HOME', 'Machine')"`;
  const javaHome = await runAndBuffer(javaHomeCmd);
  
  if (javaHome && fs.existsSync(path.join(javaHome.trim(), 'bin', 'java.exe'))) {
    core.info(`Java found at: ${javaHome.trim()}`);
    const javaBinPath = path.join(javaHome.trim(), 'bin');
    core.addPath(javaBinPath);
    process.env.PATH = `${javaBinPath};${process.env.PATH}`;
    process.env.JAVA_HOME = javaHome.trim();
  } else {
    throw new Error('Java installation not found or JAVA_HOME not set');
  }
  
  core.info('Installing jsign...');
  await exec.exec('choco', ['install', 'jsign', '-y']);
  
  // Refresh environment variables to pick up PATH changes from jsign
  await exec.exec('refreshenv');
  
  // Add jsign to PATH
  const jsignPath = 'C:\\ProgramData\\chocolatey\\lib\\jsign\\tools';
  core.addPath(jsignPath);
  process.env.PATH = `${jsignPath};${process.env.PATH}`;
};