const { flipFuses, FuseVersion, FuseV1Options } = require('@electron/fuses');
const { notarize } = require('electron-notarize');

async function applyWindowsFuses(context) {
  const { appOutDir } = context;
  const appPath = `${appOutDir}/Rocket.Chat.exe`;

  console.log(
    'AfterSign: Applying electron fuses for Windows executable:',
    appPath
  );

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

  console.log('Electron fuses applied successfully for Windows');
}

exports.default = async function afterSign(context) {
  const { electronPlatformName, appOutDir } = context;

  // For Windows: Apply fuses AFTER signing
  // electron-builder's signing runs before afterSign, so the executable is now signed
  // We can safely apply fuses without breaking the signing process
  if (electronPlatformName === 'win32') {
    await applyWindowsFuses(context);
    return;
  }

  // For macOS: Handle notarization
  if (
    electronPlatformName !== 'darwin' ||
    process.env.FORCE_NOTARIZE !== 'true'
  ) {
    return;
  }

  const appName = context.packager.appInfo.productFilename;

  process.stdout.write('Notarizing...');
  return new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      process.stdout.write('.');
    }, 15000);

    notarize({
      tool: 'notarytool',
      appBundleId: 'chat.rocket',
      appPath: `${appOutDir}/${appName}.app`,
      appleId: process.env.APPLEID,
      appleIdPassword: process.env.APPLEIDPASS,
      ascProvider: 'S6UPZG7ZR3',
      teamId: 'S6UPZG7ZR3',
    })
      .then(() => {
        clearTimeout(timer);
        console.log();
        resolve();
      })
      .catch((error) => {
        clearTimeout(timer);
        console.log();
        reject(error);
      });
  });
};
