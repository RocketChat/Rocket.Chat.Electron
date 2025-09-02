const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Forward declaration
let signWindowsOnLinux;

/**
 * Check required environment variables for signing
 */
function validateEnvironment() {
  const pkcs11Module =
    process.env.PKCS11_MODULE_PATH || '/opt/libkmsp11/libkmsp11.so';
  const kmsKeyResource = process.env.WIN_KMS_KEY_RESOURCE;
  const certFile = process.env.WIN_CERT_FILE;
  const kmsPkcs11Config = process.env.KMS_PKCS11_CONFIG;

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
  if (!fs.existsSync(pkcs11Module)) {
    console.log(
      `[winSignKms] PKCS11 module not found at ${pkcs11Module} - skipping signing (validation build)`
    );
    return null;
  }

  return { pkcs11Module, kmsKeyResource, certFile, kmsPkcs11Config };
}

/**
 * Extract key alias from KMS resource
 */
function extractKeyAlias(kmsKeyResource, kmsPkcs11Config) {
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

  const keyParts = kmsKeyResource.split('/');
  const keyIndex = keyParts.indexOf('cryptoKeys');

  console.log(`[winSignKms] Key parts: ${JSON.stringify(keyParts)}`);
  console.log(`[winSignKms] cryptoKeys index: ${keyIndex}`);

  let keyAlias;
  if (keyIndex === -1) {
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
      console.log(
        `[winSignKms] No key found in resource, will try multiple key names`
      );
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

  return keyAlias;
}

/**
 * Get possible key identifiers to try
 */
function getPossibleKeyNames(keyAlias) {
  const possibleKeyIds = keyAlias
    ? [`id:${keyAlias}`, keyAlias]
    : [
        'id:70726f6a656374732f726f636b6574636861742d726e642f6c6f636174696f6e732f75732f6b657952696e67732f456c656374726f6e5f4465736b746f705f4170702f63727970746f4b6579732f456c656374726f6e5f4465736b746f705f4170705f4b65792f63727970746f4b657956657273696f6e732f31',
        'Electron_Desktop_App_Key',
        'Electron_Desktop_App',
        'Electron-Desktop-App',
        'ElectronDesktopApp',
        'electron-desktop-app',
        'signing-key',
        'code-signing',
        'Electron_Desktop_App_Signing_Key',
      ];

  return possibleKeyIds;
}

/**
 * Check available signing tools
 */
function checkAvailableTools() {
  const availableTools = [];

  // Check for jsign
  try {
    const jsignCheck = spawnSync('jsign', ['--help'], { stdio: 'pipe' });
    if (jsignCheck.status === 0 || jsignCheck.status === 1) {
      availableTools.push('jsign');
      console.log(`[winSignKms] jsign is available`);
    }
  } catch (error) {
    console.log(`[winSignKms] jsign not available`);
  }

  // Check for gcloud
  try {
    const gcloudCheck = spawnSync('gcloud', ['--version'], { stdio: 'pipe' });
    if (gcloudCheck.status === 0) {
      availableTools.push('gcloud');
      console.log(`[winSignKms] gcloud is available`);
    }
  } catch (error) {
    console.log(`[winSignKms] gcloud not available`);
  }

  return availableTools;
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
  const env = validateEnvironment();
  if (!env) {
    return;
  }
  const { pkcs11Module, kmsKeyResource, certFile, kmsPkcs11Config } = env;

  // Extract key alias from KMS resource
  const keyAlias = extractKeyAlias(kmsKeyResource, kmsPkcs11Config);
  const possibleKeyNames = getPossibleKeyNames(keyAlias);

  console.log(
    `[winSignKms] Will try key names: ${possibleKeyNames.join(', ')}`
  );
  console.log(`[winSignKms] Certificate file: ${certFile}`);
  console.log(`[winSignKms] PKCS#11 module: ${pkcs11Module}`);

  // PKCS#11 approach is broken (segfaults), try alternative signing tools
  console.log(
    `[winSignKms] PKCS#11 approach fails with segfault, checking alternative tools...`
  );

  // Check available signing tools
  const availableTools = checkAvailableTools();

  console.log(
    `[winSignKms] Available alternative tools: ${availableTools.join(', ')}`
  );

  // If jsign is available, try to use it with Google Cloud KMS
  if (availableTools.includes('jsign')) {
    console.log(
      `[winSignKms] Attempting to sign with jsign and Google Cloud KMS...`
    );

    try {
      const fullKeyResource = `${kmsKeyResource}/cryptoKeys/Electron_Desktop_App_Key/cryptoKeyVersions/1`;
      const jsignArgs = [
        '--storetype',
        'GOOGLEKMS',
        '--storepass',
        fullKeyResource,
        '--keystore',
        'projects/rocketchat-rnd',
        '--alias',
        'Electron_Desktop_App_Key',
        '--tsaurl',
        'http://timestamp.digicert.com',
        path.resolve(input),
      ];

      console.log(`[winSignKms] jsign command: jsign ${jsignArgs.join(' ')}`);

      const jsignResult = spawnSync('jsign', jsignArgs, {
        stdio: 'pipe',
        timeout: 300000, // 5 minutes
        env: {
          ...process.env,
          GOOGLE_APPLICATION_CREDENTIALS:
            process.env.GOOGLE_APPLICATION_CREDENTIALS,
        },
      });

      console.log(`[winSignKms] jsign exit code: ${jsignResult.status}`);
      if (jsignResult.stdout) {
        console.log(
          `[winSignKms] jsign stdout: ${jsignResult.stdout.toString()}`
        );
      }
      if (jsignResult.stderr) {
        console.log(
          `[winSignKms] jsign stderr: ${jsignResult.stderr.toString()}`
        );
      }

      if (jsignResult.status === 0) {
        console.log(`[winSignKms] Successfully signed with jsign!`);
        return; // Skip the broken PKCS#11 approach
      }
    } catch (error) {
      console.log(`[winSignKms] jsign signing failed: ${error.message}`);
    }
  }

  // If gcloud is available, try a custom signing approach using gcloud + osslsigncode
  if (availableTools.includes('gcloud')) {
    console.log(
      `[winSignKms] Attempting custom signing with gcloud KMS + osslsigncode...`
    );

    try {
      // First, let's try to skip PKCS#11 and use a direct approach
      // Check if we can use openssl with the certificate directly
      console.log(
        `[winSignKms] Testing direct certificate and gcloud approach...`
      );

      // Try osslsigncode with just the certificate file (no PKCS#11)
      const directArgs = [
        'sign',
        '-certs',
        certFile,
        '-key',
        certFile, // This will fail but let's see the error
        '-t',
        'http://timestamp.digicert.com',
        '-h',
        'sha256',
        '-n',
        name,
      ];

      if (site) {
        directArgs.push('-i', site);
      }

      const tempOutput = `${input}.direct_signed`;
      directArgs.push('-in', path.resolve(input));
      directArgs.push('-out', tempOutput);

      console.log(
        `[winSignKms] Direct command: osslsigncode ${directArgs.join(' ')}`
      );

      const directResult = spawnSync('osslsigncode', directArgs, {
        stdio: 'pipe',
        timeout: 60000,
        env: {
          ...process.env,
          GOOGLE_APPLICATION_CREDENTIALS:
            process.env.GOOGLE_APPLICATION_CREDENTIALS,
        },
      });

      console.log(
        `[winSignKms] Direct approach exit code: ${directResult.status}`
      );
      if (directResult.stdout) {
        console.log(
          `[winSignKms] Direct stdout: ${directResult.stdout.toString()}`
        );
      }
      if (directResult.stderr) {
        console.log(
          `[winSignKms] Direct stderr: ${directResult.stderr.toString()}`
        );
      }

      if (directResult.status === 0) {
        // Move signed file back to original location
        fs.renameSync(tempOutput, input);
        console.log(`[winSignKms] Successfully signed with direct approach!`);
        return;
      }
      // Clean up temp file if it exists
      if (fs.existsSync(tempOutput)) {
        fs.unlinkSync(tempOutput);
      }
    } catch (error) {
      console.log(
        `[winSignKms] gcloud direct approach failed: ${error.message}`
      );
    }
  }

  console.log(
    `[winSignKms] Falling back to broken PKCS#11 approach as last resort...`
  );

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

  // Try each key name recursively to avoid await-in-loop lint error
  async function trySignWithKey(keyNames, attemptIndex = 0) {
    if (attemptIndex >= keyNames.length) {
      throw new Error(
        `[winSignKms] Failed to sign with any key name. Tried: ${keyNames.join(', ')}`
      );
    }

    const currentKeyName = keyNames[attemptIndex];
    console.log(
      `[winSignKms] Attempt ${attemptIndex + 1}/${keyNames.length}: Trying key name: ${currentKeyName}`
    );

    // Build osslsigncode command
    const args = [
      'sign',
      '-pkcs11engine',
      pkcs11Engine,
      '-pkcs11module',
      pkcs11Module,
      '-key',
      `pkcs11:object=${currentKeyName}`,
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

    console.log(`[winSignKms] Command: osslsigncode ${args.join(' ')}`);

    try {
      await new Promise((resolve, reject) => {
        const child = spawn('osslsigncode', args, {
          stdio: 'inherit',
          env: {
            ...process.env,
            KMS_PKCS11_CONFIG: kmsPkcs11Config,
          },
        });

        // Set a longer timeout for KMS operations (5 minutes)
        const timeout = setTimeout(
          () => {
            console.log(
              `[winSignKms] Killing osslsigncode process due to timeout (5 min)`
            );
            child.kill('SIGTERM');
            setTimeout(() => child.kill('SIGKILL'), 10000); // Force kill after 10s
            reject(new Error('osslsigncode timed out after 5 minutes'));
          },
          5 * 60 * 1000
        );

        child.on('exit', (code, signal) => {
          clearTimeout(timeout);
          console.log(
            `[winSignKms] osslsigncode exited with code: ${code}, signal: ${signal}`
          );

          if (code === 0) {
            // Move signed file back to original
            fs.renameSync(tempOutput, input);
            console.log(
              `[winSignKms] Successfully signed with key: ${currentKeyName}`
            );
            resolve();
          } else {
            // Clean up temp file if it exists
            if (fs.existsSync(tempOutput)) {
              fs.unlinkSync(tempOutput);
            }
            reject(
              new Error(
                `osslsigncode exited with code ${code}, signal ${signal}`
              )
            );
          }
        });

        child.on('error', (err) => {
          clearTimeout(timeout);
          console.log(
            `[winSignKms] osslsigncode process error: ${err.message}`
          );
          reject(new Error(`Failed to execute osslsigncode: ${err.message}`));
        });
      });

      console.log(
        `[winSignKms] Successfully signed on Linux with key '${currentKeyName}': ${input}`
      );
    } catch (error) {
      console.log(
        `[winSignKms] Failed with key '${currentKeyName}': ${error.message}`
      );

      // If this isn't the last attempt, try the next key name
      if (attemptIndex < keyNames.length - 1) {
        console.log(`[winSignKms] Trying next key name...`);
        return trySignWithKey(keyNames, attemptIndex + 1);
      }

      throw error;
    }
  }

  await trySignWithKey(possibleKeyNames);
};
