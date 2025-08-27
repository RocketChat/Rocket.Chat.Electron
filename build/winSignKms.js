const { spawn } = require('child_process');
const path = require('path');

module.exports = async function signWithGoogleKms(config) {
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
