const { flipFuses, FuseVersion, FuseV1Options } = require('@electron/fuses');

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
};
