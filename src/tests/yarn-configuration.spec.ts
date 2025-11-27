/**
 * Tests for yarn configuration consistency
 * 
 * This test ensures that all yarn version references in the project are synchronized
 * to prevent the "missing ) after argument list" error on fresh clones.
 * 
 * See: https://github.com/RocketChat/Rocket.Chat.Electron/issues/2919
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('Yarn Configuration', () => {
  const projectRoot = join(__dirname, '../..');
  
  it('should have consistent yarn versions across all configuration files', () => {
    // Read package.json
    const packageJsonPath = join(projectRoot, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    
    // Read .yarnrc.yml and parse manually
    const yarnrcPath = join(projectRoot, '.yarnrc.yml');
    const yarnrcContent = readFileSync(yarnrcPath, 'utf8');
    
    // Extract versions
    const packageManagerVersion = packageJson.packageManager?.replace('yarn@', '');
    const voltaYarnVersion = packageJson.volta?.yarn;
    
    // Parse yarnPath from .yarnrc.yml manually
    const yarnPathMatch = yarnrcContent.match(/yarnPath:\s*(.+)/);
    expect(yarnPathMatch).toBeTruthy();
    const yarnPath = yarnPathMatch![1].trim();
    const yarnrcVersion = yarnPath.replace('.yarn/releases/yarn-', '').replace('.cjs', '');
    
    // Ensure all versions are defined
    expect(packageManagerVersion).toBeDefined();
    expect(voltaYarnVersion).toBeDefined();
    expect(yarnrcVersion).toBeDefined();
    
    // Ensure all versions match
    expect(voltaYarnVersion).toBe(packageManagerVersion);
    expect(yarnrcVersion).toBe(packageManagerVersion);
    
    // Verify yarn release file exists
    const yarnReleasePath = join(projectRoot, '.yarn/releases', `yarn-${packageManagerVersion}.cjs`);
    expect(existsSync(yarnReleasePath)).toBe(true);
  });
  
  it('should have a valid yarn release file', () => {
    const packageJsonPath = join(projectRoot, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    const packageManagerVersion = packageJson.packageManager?.replace('yarn@', '');
    
    const yarnReleasePath = join(projectRoot, '.yarn/releases', `yarn-${packageManagerVersion}.cjs`);
    const yarnReleaseContent = readFileSync(yarnReleasePath, 'utf8');
    
    // Verify the file starts with a proper shebang and doesn't have syntax errors
    expect(yarnReleaseContent).toMatch(/^#!/);
    expect(yarnReleaseContent).not.toContain('SyntaxError');
    
    // Verify the file is not empty and has reasonable size (yarn releases are typically large)
    expect(yarnReleaseContent.length).toBeGreaterThan(100000); // At least 100KB
  });
  
  it('should have proper yarn engine requirements', () => {
    const packageJsonPath = join(projectRoot, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    
    const packageManagerVersion = packageJson.packageManager?.replace('yarn@', '');
    const devEnginesYarnRequirement = packageJson.devEngines?.yarn;
    
    expect(devEnginesYarnRequirement).toBeDefined();
    expect(devEnginesYarnRequirement).toMatch(/^>=/);
    
    // Verify that the actual yarn version satisfies the requirement
    const requiredVersion = devEnginesYarnRequirement.replace('>=', '');
    
    // Simple version comparison for major.minor.patch format
    const [reqMajor, reqMinor, reqPatch] = requiredVersion.split('.').map(Number);
    const [actualMajor, actualMinor, actualPatch] = packageManagerVersion.split('.').map(Number);
    
    expect(actualMajor).toBeGreaterThanOrEqual(reqMajor);
    if (actualMajor === reqMajor) {
      expect(actualMinor).toBeGreaterThanOrEqual(reqMinor);
      if (actualMinor === reqMinor) {
        expect(actualPatch).toBeGreaterThanOrEqual(reqPatch);
      }
    }
  });
});
