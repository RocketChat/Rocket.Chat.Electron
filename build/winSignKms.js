const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Forward declaration
let signWindowsOnLinux;

module.exports = async function signWithGoogleKms(config) {
  // Handle Linux-based signing for Windows executables
  if (process.platform === 'linux') {
    return signWindowsOnLinux(config);
  }

  if (process.platform !== 'win32') {
    console.log('[winSignKms] Skipping (non-Windows platform).');
    return;
  }

  const input = config.path;
  const name = config.name || 'Rocket.Chat';
  const { site } = config;

  const signtoolPath = process.env.SIGNTOOL_PATH || 'signtool';
  const kmsCspName = process.env.WIN_KMS_CSP || 'Google Cloud KMS Provider';
  const kmsKeyResource = process.env.WIN_KMS_KEY_RESOURCE; // projects/.../cryptoKeys/.../cryptoKeyVersions/N
  const certSha1 = process.env.WIN_KMS_CERT_SHA1; // thumbprint of issued code signing cert installed in Windows cert store
  const timestampUrl =
    process.env.WIN_TIMESTAMP_URL || 'http://timestamp.digicert.com';
  const certStore = process.env.WIN_KMS_CERT_STORE || 'MY'; // Personal store by default
  const useLocalMachine = /^true$/i.test(
    process.env.WIN_KMS_USE_LOCAL_MACHINE || 'false'
  );

  if (!kmsKeyResource) {
    throw new Error('[winSignKms] WIN_KMS_KEY_RESOURCE is required');
  }
  if (!certSha1) {
    throw new Error('[winSignKms] WIN_KMS_CERT_SHA1 is required');
  }

  const args = [
    'sign',
    '/fd',
    'SHA256',
    '/tr',
    timestampUrl,
    '/td',
    'SHA256',
    '/csp',
    kmsCspName,
    '/kc',
    kmsKeyResource,
    '/sha1',
    certSha1,
    '/s',
    certStore,
    '/d',
    name,
  ];

  if (useLocalMachine) {
    args.push('/sm');
  }

  if (site) {
    args.push('/du', site);
  }

  args.push(path.resolve(input));

  console.log('[winSignKms] Running:', signtoolPath, args.join(' '));

  await new Promise((resolve, reject) => {
    const child = spawn(signtoolPath, args, {
      stdio: 'inherit',
      windowsHide: true,
    });
    child.on('exit', (code) => {
      if (code === 0) return resolve();
      reject(new Error(`[winSignKms] signtool exited with code ${code}`));
    });
    child.on('error', (err) => reject(err));
  });
};

/**
 * Sign Windows executables on Linux using osslsigncode with Google Cloud KMS
 */
signWindowsOnLinux = async function (config) {
  console.log('[winSignKms] Linux-based Windows signing with Google Cloud KMS');

  const input = config.path;
  const name = config.name || 'Rocket.Chat';
  const { site } = config;

  // Check required environment variables
  const pkcs11Module =
    process.env.PKCS11_MODULE_PATH || '/opt/libkmsp11/libkmsp11.so';
  const kmsKeyResource = process.env.WIN_KMS_KEY_RESOURCE;
  const certFile = process.env.WIN_CERT_FILE;
  const kmsPkcs11Config = process.env.KMS_PKCS11_CONFIG;

  if (!kmsKeyResource) {
    throw new Error('[winSignKms] WIN_KMS_KEY_RESOURCE is required');
  }
  if (!certFile || !fs.existsSync(certFile)) {
    throw new Error('[winSignKms] WIN_CERT_FILE is required and must exist');
  }
  if (!fs.existsSync(pkcs11Module)) {
    throw new Error(`[winSignKms] PKCS11 module not found at ${pkcs11Module}`);
  }

  // Extract key alias from KMS resource
  // Format: projects/PROJECT/locations/LOCATION/keyRings/RING/cryptoKeys/KEY/cryptoKeyVersions/VERSION
  const keyParts = kmsKeyResource.split('/');
  const keyIndex = keyParts.indexOf('cryptoKeys');
  const keyAlias = keyParts[keyIndex + 1];

  console.log(`[winSignKms] Using key alias: ${keyAlias}`);

  // Find the PKCS#11 engine
  const possibleEngines = [
    '/usr/lib/x86_64-linux-gnu/engines-1.1/pkcs11.so',
    '/usr/lib/x86_64-linux-gnu/engines-3/pkcs11.so',
    '/usr/lib/engines-1.1/libpkcs11.so',
  ];

  let pkcs11Engine = null;
  for (const engine of possibleEngines) {
    if (fs.existsSync(engine)) {
      pkcs11Engine = engine;
      break;
    }
  }

  if (!pkcs11Engine) {
    throw new Error(
      '[winSignKms] PKCS#11 engine not found. Install libengine-pkcs11-openssl'
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

  // Sign in-place
  const tempOutput = `${input}.signed`;
  args.push('-in', path.resolve(input));
  args.push('-out', tempOutput);

  console.log(
    '[winSignKms] Running:',
    'osslsigncode',
    args.map((a) => (a.startsWith('pkcs11:') ? a : a)).join(' ')
  );

  await new Promise((resolve, reject) => {
    const child = spawn('osslsigncode', args, {
      stdio: 'inherit',
      env: {
        ...process.env,
        KMS_PKCS11_CONFIG: kmsPkcs11Config,
      },
    });

    child.on('exit', (code) => {
      if (code === 0) {
        // Move signed file back to original
        fs.renameSync(tempOutput, input);
        console.log('[winSignKms] Successfully signed on Linux:', input);
        resolve();
      } else {
        // Clean up temp file if it exists
        if (fs.existsSync(tempOutput)) {
          fs.unlinkSync(tempOutput);
        }
        reject(new Error(`[winSignKms] osslsigncode exited with code ${code}`));
      }
    });

    child.on('error', (err) => {
      reject(
        new Error(`[winSignKms] Failed to execute osslsigncode: ${err.message}`)
      );
    });
  });
};
