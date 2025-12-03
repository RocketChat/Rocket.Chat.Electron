const { flipFuses, FuseVersion, FuseV1Options } = require('@electron/fuses');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Check required environment variables for signing
 */
function validateSigningEnvironment() {
  const kmsKeyResource = process.env.WIN_KMS_KEY_RESOURCE;
  const certFile = process.env.WIN_CERT_FILE;

  if (!kmsKeyResource) {
    console.log(
      '[afterPack] WIN_KMS_KEY_RESOURCE not set - skipping executable signing'
    );
    return null;
  }
  if (!certFile || !fs.existsSync(certFile)) {
    console.log(
      '[afterPack] WIN_CERT_FILE not set or does not exist - skipping executable signing'
    );
    return null;
  }

  return { kmsKeyResource, certFile };
}

/**
 * Extract key alias from KMS resource
 */
function extractKeyAlias(kmsKeyResource) {
  const parts = kmsKeyResource.split('/');
  if (parts.length >= 6 && parts[4] === 'cryptoKeys') {
    return parts[5];
  }
  return 'Electron_Desktop_App_Key';
}

/**
 * Find jsign and gcloud commands
 */
function findSigningTools() {
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

    if (fs.existsSync(jsignChocolateyPath)) {
      jsignCmd = jsignChocolateyPath;
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
  } else {
    jsignCmd = 'jsign';
    gcloudCmd = process.env.GCLOUD_PATH || 'gcloud';
  }

  return { jsignCmd, gcloudCmd };
}

/**
 * Sign Windows executable using jsign with Google Cloud KMS
 */
async function signWindowsExecutable(exePath) {
  console.log('[afterPack] Signing Windows executable:', exePath);

  const envConfig = validateSigningEnvironment();
  if (!envConfig) {
    return;
  }

  const { kmsKeyResource, certFile } = envConfig;
  const { jsignCmd, gcloudCmd } = findSigningTools();

  if (!jsignCmd) {
    console.log('[afterPack] jsign not found - skipping signing');
    return;
  }

  if (!gcloudCmd) {
    console.log('[afterPack] gcloud not found - skipping signing');
    return;
  }

  const resourceParts = kmsKeyResource.split('/');
  const projectId = resourceParts[1];
  const location = resourceParts[3];
  const keyRingName = resourceParts[5];
  const keyName = extractKeyAlias(kmsKeyResource);

  console.log('[afterPack] Getting access token from gcloud...');
  const gcloudResult = process.platform === 'win32'
    ? spawnSync('cmd', ['/c', gcloudCmd, 'auth', 'print-access-token'], {
        stdio: 'pipe',
        timeout: 30000,
        env: {
          ...process.env,
          GOOGLE_APPLICATION_CREDENTIALS:
            process.env.GOOGLE_APPLICATION_CREDENTIALS,
          CLOUDSDK_PYTHON: process.env.CLOUDSDK_PYTHON,
        },
      })
    : spawnSync(gcloudCmd, ['auth', 'print-access-token'], {
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
    console.error(`[afterPack] Failed to get access token: ${errorOutput}`);
    return;
  }

  const accessToken = gcloudResult.stdout.toString().trim();
  if (!accessToken) {
    console.error('[afterPack] Empty access token received from gcloud');
    return;
  }

  console.log('[afterPack] Successfully obtained access token');

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
    '--name',
    'Rocket.Chat',
    '--url',
    'https://rocket.chat',
    path.resolve(exePath),
  ];

  console.log('[afterPack] Running jsign to sign executable...');
  const result = process.platform === 'win32'
    ? spawnSync('cmd', ['/c', jsignCmd].concat(jsignArgs), {
        stdio: 'pipe',
        timeout: 120000,
        env: {
          ...process.env,
          GOOGLE_APPLICATION_CREDENTIALS:
            process.env.GOOGLE_APPLICATION_CREDENTIALS,
          CLOUDSDK_PYTHON: process.env.CLOUDSDK_PYTHON,
        },
      })
    : spawnSync(jsignCmd, jsignArgs, {
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
    console.error('[afterPack] jsign stderr:', stderr);
    console.error('[afterPack] jsign stdout:', stdout);
    throw new Error(
      `[afterPack] jsign failed with exit code ${result.status}: ${stderr}`
    );
  }

  const stdout = result.stdout ? result.stdout.toString() : '';
  if (stdout) {
    console.log('[afterPack] jsign output:', stdout);
  }

  console.log('[afterPack] Successfully signed Windows executable');
}

exports.default = async function afterPack(context) {
  console.log(
    'AfterPack: Platform =',
    context.electronPlatformName,
    'OutDir =',
    context.appOutDir
  );

  // Apply security fuses for all builds
  let appPath;
  switch (context.electronPlatformName) {
    case 'darwin':
    case 'mas':
      appPath = `${context.appOutDir}/Rocket.Chat.app`;
      break;
    case 'win32':
      appPath = `${context.appOutDir}/Rocket.Chat.exe`;
      break;
    default:
      appPath = `${context.appOutDir}/rocketchat-desktop`;
      break;
  }

  console.log('Applying electron fuses for enhanced security to:', appPath);

  await flipFuses(appPath, {
    version: FuseVersion.V1,
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
    [FuseV1Options.OnlyLoadAppFromAsar]: true,
    [FuseV1Options.RunAsNode]: false,
    [FuseV1Options.EnableCookieEncryption]: false,
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    [FuseV1Options.EnableNodeCliInspectArguments]: false,
    [FuseV1Options.LoadBrowserProcessSpecificV8Snapshot]: false,
    [FuseV1Options.GrantFileProtocolExtraPrivileges]: true,
  });

  console.log('Electron fuses applied successfully');

  // Sign Windows executable if we're building for Windows and credentials are available
  if (context.electronPlatformName === 'win32' && fs.existsSync(appPath)) {
    try {
      await signWindowsExecutable(appPath);
    } catch (error) {
      console.error('[afterPack] Failed to sign executable:', error.message);
      // Don't fail the build if signing fails - it might be a validation build
      // The build will continue but the executable won't be signed
    }
  }
};
