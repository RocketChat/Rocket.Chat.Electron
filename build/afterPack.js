const { flipFuses, FuseVersion, FuseV1Options } = require('@electron/fuses');

exports.default = async function afterPack(context) {
  console.log(
    'AfterPack: Platform =',
    context.electronPlatformName,
    'OutDir =',
    context.appOutDir
  );

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

  // Fuses MUST be applied BEFORE signing. Per Electron docs:
  // "Because they are flipped at package time before you code sign your app,
  // the OS becomes responsible for ensuring those bits aren't flipped back
  // via OS-level code signing validation"
  // See: https://www.electronjs.org/docs/latest/tutorial/fuses
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
