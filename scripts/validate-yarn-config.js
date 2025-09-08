#!/usr/bin/env node
/**
 * Validation script for yarn configuration consistency
 * 
 * This script ensures that all yarn version references in the project are synchronized
 * to prevent the "missing ) after argument list" error on fresh clones.
 * 
 * See: https://github.com/RocketChat/Rocket.Chat.Electron/issues/2919
 */

const fs = require('fs');
const path = require('path');

function validateYarnConfiguration() {
  const projectRoot = path.join(__dirname, '..');
  let hasErrors = false;
  
  // Read package.json
  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.error('❌ package.json not found');
    return false;
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Read .yarnrc.yml
  const yarnrcPath = path.join(projectRoot, '.yarnrc.yml');
  if (!fs.existsSync(yarnrcPath)) {
    console.error('❌ .yarnrc.yml not found');
    return false;
  }
  
  const yarnrcContent = fs.readFileSync(yarnrcPath, 'utf8');
  
  // Extract versions
  const packageManagerVersion = packageJson.packageManager?.replace('yarn@', '');
  const voltaYarnVersion = packageJson.volta?.yarn;
  
  // Parse yarnPath from .yarnrc.yml manually
  const yarnPathMatch = yarnrcContent.match(/yarnPath:\s*(.+)/);
  if (!yarnPathMatch) {
    console.error('❌ Could not find yarnPath in .yarnrc.yml');
    hasErrors = true;
  }
  
  const yarnPath = yarnPathMatch ? yarnPathMatch[1].trim() : null;
  const yarnrcVersion = yarnPath ? yarnPath.replace('.yarn/releases/yarn-', '').replace('.cjs', '') : null;
  
  // Validate all versions are defined
  if (!packageManagerVersion) {
    console.error('❌ packageManager version not found in package.json');
    hasErrors = true;
  }
  
  if (!voltaYarnVersion) {
    console.error('❌ volta.yarn version not found in package.json');
    hasErrors = true;
  }
  
  if (!yarnrcVersion) {
    console.error('❌ yarn version not found in .yarnrc.yml');
    hasErrors = true;
  }
  
  // Validate versions match
  if (packageManagerVersion && voltaYarnVersion && packageManagerVersion !== voltaYarnVersion) {
    console.error(`❌ Version mismatch: packageManager (${packageManagerVersion}) vs volta.yarn (${voltaYarnVersion})`);
    hasErrors = true;
  }
  
  if (packageManagerVersion && yarnrcVersion && packageManagerVersion !== yarnrcVersion) {
    console.error(`❌ Version mismatch: packageManager (${packageManagerVersion}) vs .yarnrc.yml (${yarnrcVersion})`);
    hasErrors = true;
  }
  
  if (voltaYarnVersion && yarnrcVersion && voltaYarnVersion !== yarnrcVersion) {
    console.error(`❌ Version mismatch: volta.yarn (${voltaYarnVersion}) vs .yarnrc.yml (${yarnrcVersion})`);
    hasErrors = true;
  }
  
  // Verify yarn release file exists
  if (packageManagerVersion) {
    const yarnReleasePath = path.join(projectRoot, '.yarn/releases', `yarn-${packageManagerVersion}.cjs`);
    if (!fs.existsSync(yarnReleasePath)) {
      console.error(`❌ Yarn release file not found: ${yarnReleasePath}`);
      hasErrors = true;
    } else {
      // Verify the file is valid
      const yarnReleaseContent = fs.readFileSync(yarnReleasePath, 'utf8');
      
      if (!yarnReleaseContent.startsWith('#!/usr/bin/env node')) {
        console.error(`❌ Yarn release file does not start with proper shebang: ${yarnReleasePath}`);
        hasErrors = true;
      }
      
      // Check for actual syntax errors by trying to parse the first few lines
      const firstLine = yarnReleaseContent.split('\n')[0];
      if (!firstLine.startsWith('#!/usr/bin/env node')) {
        console.error(`❌ Yarn release file has invalid first line: ${yarnReleasePath}`);
        hasErrors = true;
      }
      
      if (yarnReleaseContent.length < 100000) {
        console.error(`❌ Yarn release file seems too small (${yarnReleaseContent.length} bytes): ${yarnReleasePath}`);
        hasErrors = true;
      }
    }
  }
  
  // Check devEngines requirement
  const devEnginesYarnRequirement = packageJson.devEngines?.yarn;
  if (!devEnginesYarnRequirement) {
    console.error('❌ devEngines.yarn requirement not found in package.json');
    hasErrors = true;
  } else if (packageManagerVersion) {
    // Simple version comparison
    const requiredVersion = devEnginesYarnRequirement.replace('>=', '');
    const [reqMajor, reqMinor, reqPatch] = requiredVersion.split('.').map(Number);
    const [actualMajor, actualMinor, actualPatch] = packageManagerVersion.split('.').map(Number);
    
    let satisfiesRequirement = false;
    if (actualMajor > reqMajor) {
      satisfiesRequirement = true;
    } else if (actualMajor === reqMajor) {
      if (actualMinor > reqMinor) {
        satisfiesRequirement = true;
      } else if (actualMinor === reqMinor) {
        satisfiesRequirement = actualPatch >= reqPatch;
      }
    }
    
    if (!satisfiesRequirement) {
      console.error(`❌ Yarn version ${packageManagerVersion} does not satisfy requirement ${devEnginesYarnRequirement}`);
      hasErrors = true;
    }
  }
  
  if (!hasErrors) {
    console.log('✅ All yarn configuration checks passed!');
    console.log(`   - Package Manager: yarn@${packageManagerVersion}`);
    console.log(`   - Volta: yarn@${voltaYarnVersion}`);
    console.log(`   - .yarnrc.yml: yarn-${yarnrcVersion}.cjs`);
    console.log(`   - DevEngines: ${devEnginesYarnRequirement}`);
    console.log('');
    console.log('🎉 This should resolve issue #2919 - fresh clones will work correctly!');
  }
  
  return !hasErrors;
}

if (require.main === module) {
  const success = validateYarnConfiguration();
  process.exit(success ? 0 : 1);
}

module.exports = { validateYarnConfiguration };
