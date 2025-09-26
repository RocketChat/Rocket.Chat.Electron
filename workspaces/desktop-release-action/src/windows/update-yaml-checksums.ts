import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as core from '@actions/core';
import * as yaml from 'js-yaml';

interface YamlFile {
  url: string;
  sha512: string;
  size: number;
}

interface LatestYaml {
  version: string;
  files: YamlFile[];
  path: string;
  sha512: string;
  releaseDate: string;
}

/**
 * Calculate SHA512 checksum of a file and return as base64
 */
const calculateSHA512 = (filePath: string): string => {
  const fileBuffer = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha512');
  hash.update(fileBuffer);
  return hash.digest('base64');
};

/**
 * Get file size in bytes
 */
const getFileSize = (filePath: string): number => {
  const stats = fs.statSync(filePath);
  return stats.size;
};

/**
 * Update latest.yml with correct checksums after signing Windows packages
 */
export const updateWindowsYamlChecksums = async (distPath: string): Promise<void> => {
  core.info('Updating latest.yml with correct checksums for signed Windows packages...');
  
  const yamlPath = path.join(distPath, 'latest.yml');
  
  // Check if latest.yml exists
  if (!fs.existsSync(yamlPath)) {
    core.warning('latest.yml not found, skipping checksum update');
    return;
  }
  
  try {
    // Read and parse the existing YAML file
    const yamlContent = fs.readFileSync(yamlPath, 'utf8');
    const yamlData = yaml.load(yamlContent) as LatestYaml;
    
    core.info(`Updating checksums for version ${yamlData.version}`);
    
    // Update checksums for all files
    for (const file of yamlData.files) {
      const fileName = file.url;
      const filePath = path.join(distPath, fileName);
      
      if (!fs.existsSync(filePath)) {
        core.warning(`File not found: ${fileName}, skipping...`);
        continue;
      }
      
      // Calculate new checksum and size
      const newChecksum = calculateSHA512(filePath);
      const newSize = getFileSize(filePath);
      
      if (file.sha512 !== newChecksum) {
        core.info(`Updating ${fileName}:`);
        core.info(`  Old SHA512: ${file.sha512}`);
        core.info(`  New SHA512: ${newChecksum}`);
        core.info(`  Old size: ${file.size}`);
        core.info(`  New size: ${newSize}`);
        
        file.sha512 = newChecksum;
        file.size = newSize;
      } else {
        core.info(`${fileName} checksum unchanged`);
      }
    }
    
    // Update the main path file checksum (usually the primary installer)
    if (yamlData.path) {
      const mainFilePath = path.join(distPath, yamlData.path);
      if (fs.existsSync(mainFilePath)) {
        const mainChecksum = calculateSHA512(mainFilePath);
        if (yamlData.sha512 !== mainChecksum) {
          core.info(`Updating main installer ${yamlData.path}:`);
          core.info(`  Old SHA512: ${yamlData.sha512}`);
          core.info(`  New SHA512: ${mainChecksum}`);
          yamlData.sha512 = mainChecksum;
        }
      }
    }
    
    // Write the updated YAML back to file
    const updatedYaml = yaml.dump(yamlData, {
      lineWidth: -1, // Don't wrap lines
      noRefs: true,
      quotingType: "'", // Use single quotes
    });
    
    fs.writeFileSync(yamlPath, updatedYaml);
    core.info(`✅ Successfully updated latest.yml with correct checksums`);
    
  } catch (error) {
    core.error(`Failed to update latest.yml: ${error}`);
    throw error;
  }
};

/**
 * Update all platform YAML files (latest.yml, latest-mac.yml, latest-linux.yml)
 * But for now, we only need to update latest.yml for Windows
 */
export const updateYamlChecksums = async (distPath: string): Promise<void> => {
  await updateWindowsYamlChecksums(distPath);
};