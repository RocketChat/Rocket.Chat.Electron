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
  // Verify Java is already available (should be set up by workflow)
  core.info('Verifying Java installation...');
  try {
    await exec.exec('java', ['-version']);
    core.info('✅ Java is available');
  } catch (error) {
    throw new Error('Java not found. Please ensure Java is set up in the workflow before calling this action.');
  }
  
  core.info('Installing jsign...');
  await exec.exec('choco', ['install', 'jsign', '-y']);
  
  // Manually add jsign to PATH (more reliable than refreshenv in CI)
  const jsignPath = 'C:\\ProgramData\\chocolatey\\lib\\jsign\\tools';
  if (fs.existsSync(jsignPath)) {
    core.info(`Adding jsign to PATH: ${jsignPath}`);
    core.addPath(jsignPath);
    process.env.PATH = `${jsignPath};${process.env.PATH}`;
    
    // Verify jsign is now accessible
    const jsignCmd = path.join(jsignPath, 'jsign.cmd');
    if (fs.existsSync(jsignCmd)) {
      core.info(`✅ jsign.cmd found at ${jsignCmd}`);
      
      // Test jsign command
      try {
        await exec.exec('jsign', ['--help'], {
          ignoreReturnCode: true,
          silent: true
        });
        core.info('✅ jsign is working correctly');
      } catch (error) {
        core.warning(`jsign command test failed: ${error}`);
      }
    } else {
      throw new Error(`jsign.cmd not found at expected location: ${jsignCmd}`);
    }
  } else {
    throw new Error(`jsign installation directory not found: ${jsignPath}`);
  }
};