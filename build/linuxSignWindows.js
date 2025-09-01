const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Helper function to check if a command exists
async function checkCommand(command) {
  return new Promise((resolve) => {
    const child = spawn('which', [command], { stdio: 'ignore' });
    child.on('exit', (code) => {
      resolve(code === 0);
    });
  });
}

/**
 * Sign Windows executables on Linux using osslsigncode with Google Cloud KMS
 * This is used because Google Cloud KMS works better with PKCS#11 on Linux
 */
module.exports = async function signWindowsOnLinux(config) {
  // Only run on Linux when signing Windows binaries
  if (process.platform !== 'linux') {
    console.log('[linuxSignWindows] Skipping - not running on Linux');
    return;
  }

  const input = config.path;
  const name = config.name || 'Rocket.Chat';
  const { site } = config;

  console.log('[linuxSignWindows] Signing Windows executable on Linux');
  console.log('[linuxSignWindows] Input:', input);

  // Check if osslsigncode is available
  const osslsigncodeAvailable = await checkCommand('osslsigncode');
  if (!osslsigncodeAvailable) {
    throw new Error(
      '[linuxSignWindows] osslsigncode not found. Please install it: apt-get install osslsigncode'
    );
  }

  // Environment variables for KMS configuration
  const pkcs11Module =
    process.env.PKCS11_MODULE_PATH || '/opt/libkmsp11/libkmsp11.so';
  const kmsKeyUri = process.env.WIN_KMS_KEY_RESOURCE;
  const certFile = process.env.WIN_CERT_FILE;
  const googleCreds = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const kmsPkcs11Config = process.env.KMS_PKCS11_CONFIG;

  // Validate required environment variables
  if (!kmsKeyUri) {
    throw new Error('[linuxSignWindows] WIN_KMS_KEY_RESOURCE is required');
  }
  if (!certFile) {
    throw new Error(
      '[linuxSignWindows] WIN_CERT_FILE is required (path to certificate file)'
    );
  }
  if (!googleCreds) {
    throw new Error(
      '[linuxSignWindows] GOOGLE_APPLICATION_CREDENTIALS is required'
    );
  }
  if (!fs.existsSync(pkcs11Module)) {
    throw new Error(
      `[linuxSignWindows] PKCS11 module not found at ${pkcs11Module}`
    );
  }
  if (!fs.existsSync(certFile)) {
    throw new Error(
      `[linuxSignWindows] Certificate file not found at ${certFile}`
    );
  }

  // Extract key alias from KMS resource URI
  // Format: projects/PROJECT/locations/LOCATION/keyRings/RING/cryptoKeys/KEY/cryptoKeyVersions/VERSION
  const keyAlias = kmsKeyUri.split('/').slice(-3, -2)[0]; // Gets the KEY part

  // Build osslsigncode command
  const args = [
    'sign',
    '-pkcs11engine',
    '/usr/lib/x86_64-linux-gnu/engines-1.1/pkcs11.so',
    '-pkcs11module',
    pkcs11Module,
    '-key',
    `pkcs11:object=${keyAlias}`,
    '-certs',
    certFile,
    '-t',
    'http://timestamp.digicert.com',
    '-h',
    'sha256',
    '-n',
    name,
  ];

  if (site) {
    args.push('-i', site);
  }

  // Add verbose output for debugging
  args.push('-verbose');

  // Input and output files
  args.push('-in', path.resolve(input));

  // Sign in-place (overwrite the original file)
  const tempOutput = `${input}.signed`;
  args.push('-out', tempOutput);

  console.log('[linuxSignWindows] Command:', 'osslsigncode', args.join(' '));

  // Execute osslsigncode
  await new Promise((resolve, reject) => {
    const child = spawn('osslsigncode', args, {
      stdio: 'inherit',
      env: {
        ...process.env,
        GOOGLE_APPLICATION_CREDENTIALS: googleCreds,
        KMS_PKCS11_CONFIG: kmsPkcs11Config,
      },
    });

    child.on('exit', (code) => {
      if (code === 0) {
        // Move signed file back to original location
        fs.renameSync(tempOutput, input);
        console.log('[linuxSignWindows] Successfully signed:', input);
        resolve();
      } else {
        reject(
          new Error(`[linuxSignWindows] osslsigncode exited with code ${code}`)
        );
      }
    });

    child.on('error', (err) => {
      reject(
        new Error(
          `[linuxSignWindows] Failed to execute osslsigncode: ${err.message}`
        )
      );
    });
  });
};
