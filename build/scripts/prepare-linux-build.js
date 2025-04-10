#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Source and destination paths
const APP_DIR = path.join(__dirname, '../../app');
const SOURCE_FILES = [
  {
    src: path.join(__dirname, '../appimage/appimage-launcher.sh'),
    dest: path.join(APP_DIR, 'appimage-launcher.sh'),
  },
  {
    src: path.join(__dirname, '../tarball/set-permissions.sh'),
    dest: path.join(APP_DIR, 'set-permissions.sh'),
  },
  {
    src: path.join(__dirname, '../tarball/README.txt'),
    dest: path.join(APP_DIR, 'README.txt'),
  },
];

console.log('Preparing Linux build files...');

// Ensure the app directory exists
if (!fs.existsSync(APP_DIR)) {
  fs.mkdirSync(APP_DIR, { recursive: true });
}

// Copy all source files to the app directory
SOURCE_FILES.forEach(({ src, dest }) => {
  try {
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(`Copied ${path.basename(src)} to app directory`);

      // Ensure executable permissions
      if (src.endsWith('.sh')) {
        fs.chmodSync(dest, '755');
        console.log(`Set executable permissions for ${path.basename(dest)}`);
      }
    } else {
      console.error(`Source file not found: ${src}`);
    }
  } catch (error) {
    console.error(`Error copying ${src}: ${error.message}`);
  }
});

console.log('Linux build preparation completed.');
