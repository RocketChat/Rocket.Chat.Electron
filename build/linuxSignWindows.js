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
    console.log('[linuxSignWindows] WIN_KMS_KEY_RESOURCE not set - skipping signing (validation build)');
    return;
  }
  if (!certFile) {
    console.log('[linuxSignWindows] WIN_CERT_FILE not set - skipping signing (validation build)');
    return;
  }
  if (!googleCreds) {
    console.log('[linuxSignWindows] GOOGLE_APPLICATION_CREDENTIALS not set - skipping signing (validation build)');
    return;
  }
  if (!fs.existsSync(pkcs11Module)) {
    console.log(`[linuxSignWindows] PKCS11 module not found at ${pkcs11Module} - skipping signing (validation build)`);
    return;
  }
  if (!fs.existsSync(certFile)) {
    console.log(`[linuxSignWindows] Certificate file not found at ${certFile} - skipping signing (validation build)`);
    return;
  }

  // Extract key alias from KMS resource URI
  // Format: projects/PROJECT/locations/LOCATION/keyRings/RING/cryptoKeys/KEY/cryptoKeyVersions/VERSION
  // The PKCS#11 object name should be the full path without the version
  // e.g., projects/PROJECT/locations/LOCATION/keyRings/RING/cryptoKeys/KEY
  const keyAlias = kmsKeyUri.replace(/\/cryptoKeyVersions\/\d+$/, '');

  // Find the PKCS#11 engine (different locations on different Ubuntu versions)
  const possibleEngines = [
    '/usr/lib/x86_64-linux-gnu/engines-3/pkcs11.so', // Ubuntu 22.04+
    '/usr/lib/x86_64-linux-gnu/engines-1.1/pkcs11.so', // Ubuntu 20.04
    '/usr/lib/engines-1.1/libpkcs11.so',
  ];

  let pkcs11Engine = null;
  for (const engine of possibleEngines) {
    if (fs.existsSync(engine)) {
      pkcs11Engine = engine;
      console.log(`[linuxSignWindows] Using PKCS#11 engine: ${engine}`);
      break;
    }
  }

  if (!pkcs11Engine) {
    throw new Error(
      '[linuxSignWindows] PKCS#11 engine not found. Install libengine-pkcs11-openssl'
    );
  }

  // Build osslsigncode command
  const args = [
    'sign',
    '-pkcs11engine',
    pkcs11Engine,
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
