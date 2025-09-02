const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Forward declaration
let signWindowsOnLinux;

/**
 * Check required environment variables for signing
 */
function validateEnvironment() {
  const kmsKeyResource = process.env.WIN_KMS_KEY_RESOURCE;
  const certFile = process.env.WIN_CERT_FILE;

  if (!kmsKeyResource) {
    console.log(
      '[winSignKms] WIN_KMS_KEY_RESOURCE not set - skipping signing (validation build)'
    );
    return null;
  }
  if (!certFile || !fs.existsSync(certFile)) {
    console.log(
      '[winSignKms] WIN_CERT_FILE not set or does not exist - skipping signing (validation build)'
    );
    return null;
  }

  return { kmsKeyResource, certFile };
}

/**
 * Extract key alias from KMS resource
 */
function extractKeyAlias(kmsKeyResource) {
  // Format: projects/PROJECT/locations/LOCATION/keyRings/RING/cryptoKeys/KEY/cryptoKeyVersions/VERSION
  const parts = kmsKeyResource.split('/');
  if (parts.length >= 6 && parts[4] === 'cryptoKeys') {
    return parts[5];
  }
  // Fallback to default key name if we can't parse
  return 'Electron_Desktop_App_Key';
}

/**
 * Check available tools
 */
function checkAvailableTools() {
  const jsignResult = spawnSync('jsign', ['--help'], { stdio: 'pipe' });
  const jsignAvailable = jsignResult.status === 0;

  const gcloudResult = spawnSync('gcloud', ['--version'], { stdio: 'pipe' });
  const gcloudAvailable = gcloudResult.status === 0;

  console.log(`[winSignKms] jsign available: ${jsignAvailable}`);
  console.log(`[winSignKms] gcloud available: ${gcloudAvailable}`);

  return { jsignAvailable, gcloudAvailable };
}

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
  const kmsKeyResource = process.env.WIN_KMS_KEY_RESOURCE;
  const certSha1 = process.env.WIN_KMS_CERT_SHA1;
  const timestampUrl =
    process.env.WIN_TIMESTAMP_URL || 'http://timestamp.digicert.com';
  const certStore = process.env.WIN_KMS_CERT_STORE || 'MY';
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
 * Sign Windows executables on Linux using jsign with Google Cloud KMS
 */
signWindowsOnLinux = async function (config) {
  console.log(
    '[winSignKms] Linux-based Windows signing with jsign + Google Cloud KMS'
  );

  const input = config.path;
  const name = config.name || 'Rocket.Chat';
  const { site } = config;

  // Validate environment
  const envConfig = validateEnvironment();
  if (!envConfig) {
    return;
  }

  const { kmsKeyResource, certFile } = envConfig;

  // Check available tools
  const { jsignAvailable, gcloudAvailable } = checkAvailableTools();

  if (!jsignAvailable) {
    throw new Error('[winSignKms] jsign not available. Please install jsign.');
  }

  if (!gcloudAvailable) {
    throw new Error(
      '[winSignKms] gcloud not available. Please install Google Cloud CLI.'
    );
  }

  // Extract components from KMS resource path
  // Format: projects/PROJECT/locations/LOCATION/keyRings/RING/cryptoKeys/KEY/cryptoKeyVersions/VERSION
  const resourceParts = kmsKeyResource.split('/');
  const projectId = resourceParts[1];
  const location = resourceParts[3];
  const keyRingName = resourceParts[5];
  const keyName = extractKeyAlias(kmsKeyResource);

  console.log(`[winSignKms] Using project: ${projectId}`);
  console.log(`[winSignKms] Using location: ${location}`);
  console.log(`[winSignKms] Using keyring: ${keyRingName}`);
  console.log(`[winSignKms] Using key: ${keyName}`);

  // Get access token using gcloud
  console.log('[winSignKms] Getting access token from gcloud...');
  const gcloudResult = spawnSync('gcloud', ['auth', 'print-access-token'], {
    stdio: 'pipe',
    timeout: 30000,
    env: {
      ...process.env,
      GOOGLE_APPLICATION_CREDENTIALS:
        process.env.GOOGLE_APPLICATION_CREDENTIALS,
    },
  });

  if (gcloudResult.status !== 0) {
    const errorOutput = gcloudResult.stderr
      ? gcloudResult.stderr.toString()
      : 'Unknown error';
    throw new Error(`[winSignKms] Failed to get access token: ${errorOutput}`);
  }

  const accessToken = gcloudResult.stdout.toString().trim();
  if (!accessToken) {
    throw new Error('[winSignKms] Empty access token received from gcloud');
  }

  console.log('[winSignKms] Successfully obtained access token');

  // Build jsign command
  const jsignArgs = [
    '--storetype',
    'GOOGLECLOUD',
    '--keystore',
    `projects/${projectId}/locations/${location}/keyRings/${keyRingName}`,
    '--storepass',
    accessToken,
    '--alias',
    keyName,
    '--certfile',
    certFile,
    '--tsaurl',
    'http://timestamp.digicert.com',
    path.resolve(input),
  ];

  if (name) {
    jsignArgs.push('--name', name);
  }

  if (site) {
    jsignArgs.push('--url', site);
  }

  console.log('[winSignKms] Running jsign with masked token...');
  console.log(
    `[winSignKms] jsign --storetype GOOGLECLOUD --keystore projects/${projectId}/locations/${location}/keyRings/${keyRingName} --storepass [MASKED] --alias ${keyName} --certfile ${certFile} --tsaurl http://timestamp.digicert.com ${path.resolve(input)}`
  );

  // Execute jsign
  const result = spawnSync('jsign', jsignArgs, {
    stdio: 'pipe',
    timeout: 120000,
    env: {
      ...process.env,
      GOOGLE_APPLICATION_CREDENTIALS:
        process.env.GOOGLE_APPLICATION_CREDENTIALS,
    },
  });

  if (result.status !== 0) {
    const stderr = result.stderr ? result.stderr.toString() : '';
    const stdout = result.stdout ? result.stdout.toString() : '';
    console.error('[winSignKms] jsign stderr:', stderr);
    console.error('[winSignKms] jsign stdout:', stdout);
    throw new Error(
      `[winSignKms] jsign failed with exit code ${result.status}: ${stderr}`
    );
  }

  const stdout = result.stdout ? result.stdout.toString() : '';
  if (stdout) {
    console.log('[winSignKms] jsign output:', stdout);
  }

  console.log('[winSignKms] Successfully signed Windows executable with jsign');
};
