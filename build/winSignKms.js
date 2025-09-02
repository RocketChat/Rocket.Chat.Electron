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
    console.log(
      '[winSignKms] WIN_KMS_KEY_RESOURCE not set - skipping signing (validation build)'
    );
    return;
  }
  if (!certSha1) {
    console.log(
      '[winSignKms] WIN_KMS_CERT_SHA1 not set - skipping signing (validation build)'
    );
    return;
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
    console.log(
      '[winSignKms] WIN_KMS_KEY_RESOURCE not set - skipping signing (validation build)'
    );
    return;
  }
  if (!certFile || !fs.existsSync(certFile)) {
    console.log(
      '[winSignKms] WIN_CERT_FILE not set or does not exist - skipping signing (validation build)'
    );
    return;
  }
  if (!fs.existsSync(pkcs11Module)) {
    console.log(
      `[winSignKms] PKCS11 module not found at ${pkcs11Module} - skipping signing (validation build)`
    );
    return;
  }

  // Extract key alias from KMS resource
  // Format: projects/PROJECT/locations/LOCATION/keyRings/RING/cryptoKeys/KEY/cryptoKeyVersions/VERSION
  // According to Google Cloud KMS PKCS#11 documentation, when using a config file with key_ring,
  // use just the key name with pkcs11:object=KEY_NAME, not the full path

  console.log(`[winSignKms] Full KMS resource: ${kmsKeyResource}`);
  console.log(`[winSignKms] KMS resource length: ${kmsKeyResource.length}`);
  console.log(`[winSignKms] KMS resource type: ${typeof kmsKeyResource}`);
  console.log(
    `[winSignKms] First 20 chars: "${kmsKeyResource.substring(0, 20)}"`
  );
  console.log(`[winSignKms] KMS PKCS#11 config: ${kmsPkcs11Config}`);
  // Debug: show config file contents if it exists
  if (kmsPkcs11Config && fs.existsSync(kmsPkcs11Config)) {
    const configContent = fs.readFileSync(kmsPkcs11Config, 'utf8');
    console.log(`[winSignKms] Config file contents:\n${configContent}`);
  }

  // Extract just the key name (not the full path)
  // Based on Google Cloud KMS PKCS#11 documentation and working examples,
  // when using a config file with key_ring specified, use the key name only
  const keyParts = kmsKeyResource.split('/');
  const keyIndex = keyParts.indexOf('cryptoKeys');

  console.log(`[winSignKms] Key parts: ${JSON.stringify(keyParts)}`);
  console.log(`[winSignKms] cryptoKeys index: ${keyIndex}`);

  let keyAlias;
  if (keyIndex === -1) {
    // If cryptoKeys not found, the resource might be truncated to just the key_ring
    // In this case, we need to extract the key name from a different source
    // Check if there's a separate environment variable or use a hardcoded fallback
    const fullKeyResource =
      process.env.WIN_KMS_FULL_KEY_RESOURCE || process.env.WIN_KMS_KEY_RESOURCE;
    console.log(`[winSignKms] Trying full key resource: ${fullKeyResource}`);

    if (fullKeyResource && fullKeyResource !== kmsKeyResource) {
      const fullKeyParts = fullKeyResource.split('/');
      const fullKeyIndex = fullKeyParts.indexOf('cryptoKeys');
      if (fullKeyIndex !== -1 && fullKeyIndex + 1 < fullKeyParts.length) {
        keyAlias = fullKeyParts[fullKeyIndex + 1];
        console.log(`[winSignKms] Using key from full resource: ${keyAlias}`);
      }
    }

    if (!keyAlias) {
      // Last resort: try multiple common key names based on the keyRing name
      const possibleKeyNames = [
        'Electron_Desktop_App', // Same as keyRing
        'Electron-Desktop-App', // Hyphenated version
        'ElectronDesktopApp', // CamelCase
        'electron-desktop-app', // lowercase
        'signing-key', // Generic
        'code-signing', // Generic
        'Electron_Desktop_App_Signing_Key', // Original fallback
      ];
      
      keyAlias = possibleKeyNames[0]; // Try the first one (most likely)
      console.log(`[winSignKms] Using fallback key name: ${keyAlias}`);
      console.log(`[winSignKms] Available fallback options: ${possibleKeyNames.join(', ')}`);
    }
  } else {
    if (keyIndex + 1 >= keyParts.length) {
      throw new Error(
        `[winSignKms] Invalid KMS key resource format: ${kmsKeyResource}`
      );
    }
    keyAlias = keyParts[keyIndex + 1];
    console.log(`[winSignKms] Extracted key name: ${keyAlias}`);
  }

  console.log(`[winSignKms] Using key alias: ${keyAlias}`);
  console.log(`[winSignKms] Certificate file: ${certFile}`);
  console.log(`[winSignKms] PKCS#11 module: ${pkcs11Module}`);

  // Find the PKCS#11 engine
  const possibleEngines = [
    '/usr/lib/x86_64-linux-gnu/engines-3/pkcs11.so', // Ubuntu 22.04+ with OpenSSL 3
    '/usr/lib/x86_64-linux-gnu/engines-1.1/pkcs11.so', // Ubuntu 20.04
    '/usr/lib/engines-1.1/libpkcs11.so',
    '/usr/lib/x86_64-linux-gnu/engines-1.1/libpkcs11.so', // Alternative path
  ];

  let pkcs11Engine = null;
  console.log(`[winSignKms] Looking for PKCS#11 engine...`);
  for (const engine of possibleEngines) {
    console.log(`[winSignKms] Checking engine: ${engine}`);
    if (fs.existsSync(engine)) {
      pkcs11Engine = engine;
      console.log(`[winSignKms] Found PKCS#11 engine: ${engine}`);
      break;
    } else {
      console.log(`[winSignKms] Engine not found: ${engine}`);
    }
  }

  if (!pkcs11Engine) {
    throw new Error(
      '[winSignKms] PKCS#11 engine not found. Install libengine-pkcs11-openssl'
    );
  }

  // Build osslsigncode command
  // Based on working examples from Google Cloud KMS PKCS#11 documentation
  const args = [
    'sign',
    '-pkcs11engine',
    pkcs11Engine,
    '-pkcs11module',
    pkcs11Module,
    '-key',
    `pkcs11:object=${keyAlias}`, // Key name only, config file has key_ring
    '-certs',
    certFile,
    '-t',
    'http://timestamp.digicert.com',
    '-h',
    'sha256',
    '-n',
    name,
  ];

  console.log(`[winSignKms] osslsigncode command:`);
  console.log(`[winSignKms] osslsigncode ${args.join(' ')}`);
  console.log(`[winSignKms] Environment variables:`);
  console.log(
    `[winSignKms] - KMS_PKCS11_CONFIG: ${process.env.KMS_PKCS11_CONFIG}`
  );
  console.log(
    `[winSignKms] - GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS ? 'set' : 'not set'}`
  );

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
