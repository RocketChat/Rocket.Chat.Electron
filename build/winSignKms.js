const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Forward declarations
let signWindowsOnLinux;
let signWindowsOnWindows;

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
  let jsignCmd;
  let gcloudCmd;

  if (process.platform === 'win32') {
    const jsignChocolateyPath =
      'C:\\ProgramData\\chocolatey\\lib\\jsign\\tools\\jsign.cmd';
    const gcloudChocolateyPath =
      'C:\\ProgramData\\chocolatey\\lib\\gcloudsdk\\tools\\google-cloud-sdk\\bin\\gcloud.cmd';
    const gcloudWingetPath1 =
      'C:\\Program Files\\Google\\Cloud SDK\\google-cloud-sdk\\bin\\gcloud.cmd';
    const gcloudWingetPath2 = process.env.LOCALAPPDATA
      ? path.join(
          process.env.LOCALAPPDATA,
          'Google',
          'Cloud SDK',
          'google-cloud-sdk',
          'bin',
          'gcloud.cmd'
        )
      : null;

    const jsignAvailable = fs.existsSync(jsignChocolateyPath);

    if (jsignAvailable) {
      jsignCmd = jsignChocolateyPath;
      console.log(`[winSignKms] jsign found at: ${jsignCmd}`);
    } else {
      console.log(`[winSignKms] jsign not found at: ${jsignChocolateyPath}`);
    }

    if (fs.existsSync(gcloudChocolateyPath)) {
      gcloudCmd = gcloudChocolateyPath;
    } else if (fs.existsSync(gcloudWingetPath1)) {
      gcloudCmd = gcloudWingetPath1;
    } else if (gcloudWingetPath2 && fs.existsSync(gcloudWingetPath2)) {
      gcloudCmd = gcloudWingetPath2;
    } else {
      const whereRes = spawnSync('where', ['gcloud'], { stdio: 'pipe' });
      if (whereRes.status === 0) {
        const first = whereRes.stdout.toString().split(/\r?\n/).find(Boolean);
        if (first) gcloudCmd = first.trim();
      }
    }

    const gcloudAvailable = Boolean(gcloudCmd);

    if (gcloudAvailable) {
      console.log(`[winSignKms] gcloud found at: ${gcloudCmd}`);
    } else {
      console.log('[winSignKms] gcloud not found in known locations or PATH');
    }

    console.log(
      `[winSignKms] jsign available: ${jsignAvailable} (${jsignCmd})`
    );
    console.log(
      `[winSignKms] gcloud available: ${gcloudAvailable} (${gcloudCmd})`
    );

    return { jsignAvailable, gcloudAvailable, jsignCmd, gcloudCmd };
  }

  // Linux/macOS - use normal PATH resolution
  jsignCmd = 'jsign';
  gcloudCmd = 'gcloud';

  const jsignResult = spawnSync(jsignCmd, ['--help'], { stdio: 'pipe' });
  const jsignAvailable = jsignResult.status === 0;

  const gcloudResult = spawnSync(gcloudCmd, ['--version'], { stdio: 'pipe' });
  const gcloudAvailable = gcloudResult.status === 0;

  console.log(`[winSignKms] jsign available: ${jsignAvailable}`);
  console.log(`[winSignKms] gcloud available: ${gcloudAvailable}`);

  if (!jsignAvailable) {
    console.log(
      '[winSignKms] jsign check failed:',
      jsignResult.error?.message || 'No error message'
    );
  }
  if (!gcloudAvailable) {
    console.log(
      '[winSignKms] gcloud check failed:',
      gcloudResult.error?.message || 'No error message'
    );
  }

  return { jsignAvailable, gcloudAvailable, jsignCmd, gcloudCmd };
}

module.exports = async function signWithGoogleKms(config) {
  // Handle Linux-based signing for Windows executables
  if (process.platform === 'linux') {
    return signWindowsOnLinux(config);
  }

  // Handle Windows-based signing with jsign (preferred method)
  if (process.platform === 'win32') {
    return signWindowsOnWindows(config);
  }

  console.log('[winSignKms] Skipping (unsupported platform).');
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

  // Skip files that don't need standard Authenticode signing
  const ext = path.extname(input).toLowerCase();
  const skipExtensions = ['.appx', '.zip'];
  if (skipExtensions.includes(ext)) {
    console.log(
      `[winSignKms] Skipping ${ext} file (not applicable for Authenticode signing):`,
      path.basename(input)
    );
    return;
  }

  // Validate environment
  const envConfig = validateEnvironment();
  if (!envConfig) {
    return;
  }

  const { kmsKeyResource, certFile } = envConfig;

  // Check available tools
  const { jsignAvailable, gcloudAvailable, jsignCmd, gcloudCmd } =
    checkAvailableTools();

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
  const gcloudResult = spawnSync(gcloudCmd, ['auth', 'print-access-token'], {
    stdio: 'pipe',
    timeout: 30000,
    env: {
      ...process.env,
      GOOGLE_APPLICATION_CREDENTIALS:
        process.env.GOOGLE_APPLICATION_CREDENTIALS,
      CLOUDSDK_PYTHON: process.env.CLOUDSDK_PYTHON,
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
  const result = spawnSync(jsignCmd, jsignArgs, {
    stdio: 'pipe',
    timeout: 120000,
    env: {
      ...process.env,
      GOOGLE_APPLICATION_CREDENTIALS:
        process.env.GOOGLE_APPLICATION_CREDENTIALS,
      CLOUDSDK_PYTHON: process.env.CLOUDSDK_PYTHON,
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

/**
 * Sign Windows executables on Windows using jsign with Google Cloud KMS
 */
signWindowsOnWindows = async function (config) {
  console.log(
    '[winSignKms] Windows-based signing with jsign + Google Cloud KMS'
  );

  const input = config.path;
  const name = config.name || 'Rocket.Chat';
  const { site } = config;

  // Skip files that don't need standard Authenticode signing
  const ext = path.extname(input).toLowerCase();
  const skipExtensions = ['.appx', '.zip'];
  if (skipExtensions.includes(ext)) {
    console.log(
      `[winSignKms] Skipping ${ext} file (not applicable for Authenticode signing):`,
      path.basename(input)
    );
    return;
  }

  // Validate environment
  const envConfig = validateEnvironment();
  if (!envConfig) {
    return;
  }

  const { kmsKeyResource, certFile } = envConfig;

  // Check available tools
  const { jsignAvailable, gcloudAvailable, jsignCmd, gcloudCmd } =
    checkAvailableTools();

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
  const gcloudResult = spawnSync(
    'cmd',
    ['/c', gcloudCmd, 'auth', 'print-access-token'],
    {
      stdio: 'pipe',
      timeout: 30000,
      env: {
        ...process.env,
        GOOGLE_APPLICATION_CREDENTIALS:
          process.env.GOOGLE_APPLICATION_CREDENTIALS,
        CLOUDSDK_PYTHON: process.env.CLOUDSDK_PYTHON,
      },
    }
  );

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
  const result = spawnSync('cmd', ['/c', jsignCmd].concat(jsignArgs), {
    stdio: 'pipe',
    timeout: 120000,
    env: {
      ...process.env,
      GOOGLE_APPLICATION_CREDENTIALS:
        process.env.GOOGLE_APPLICATION_CREDENTIALS,
      CLOUDSDK_PYTHON: process.env.CLOUDSDK_PYTHON,
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
