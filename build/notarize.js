const { notarize } = require('electron-notarize');

exports.default = function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (
    electronPlatformName !== 'darwin' ||
    process.env.IS_PULL_REQUEST !== 'false'
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
      appBundleId: 'chat.rocket',
      appPath: `${appOutDir}/${appName}.app`,
      appleId: process.env.APPLEID,
      appleIdPassword: process.env.APPLEIDPASS,
      ascProvider: 'S6UPZG7ZR3',
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
