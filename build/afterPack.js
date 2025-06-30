const { flipFuses, FuseVersion, FuseV1Options } = require('@electron/fuses');

exports.default = async function afterPack(context) {
  console.log(
    'AfterPack: Platform =',
    context.electronPlatformName,
    'OutDir =',
    context.appOutDir
  );

  // Skip fuses for MAS builds - they are incompatible
  if (
    context.electronPlatformName === 'mas' ||
    context.appOutDir.includes('mas-universal')
  ) {
    console.log(
      'Skipping fuses for MAS build (App Store has its own integrity validation)'
    );
    return;
  }

  // Apply security fuses for regular builds
  let appPath;
  if (context.electronPlatformName === 'darwin') {
    appPath = `${context.appOutDir}/Rocket.Chat.app`;
  } else if (context.electronPlatformName === 'win32') {
    appPath = `${context.appOutDir}/Rocket.Chat.exe`;
  } else {
    appPath = `${context.appOutDir}/rocketchat-desktop`;
  }

  console.log('Applying electron fuses for enhanced security to:', appPath);

  await flipFuses(appPath, {
    version: FuseVersion.V1,
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
    [FuseV1Options.OnlyLoadAppFromAsar]: true,
    [FuseV1Options.RunAsNode]: true,
    [FuseV1Options.EnableCookieEncryption]: false,
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: true,
    [FuseV1Options.EnableNodeCliInspectArguments]: true,
    [FuseV1Options.LoadBrowserProcessSpecificV8Snapshot]: false,
    [FuseV1Options.GrantFileProtocolExtraPrivileges]: true,
  });

  console.log('Electron fuses applied successfully');
};
