const fs = require('fs');
const { promisify } = require('util');

const { convert: convertToIcns } = require('@fiahfy/icns-convert');
const { convert: convertToIco } = require('@fiahfy/ico-convert');
const { createConverter } = require('convert-svg-to-png');
const rimraf = require('rimraf');

let deferredConverter = Promise.resolve(createConverter());

const convertSvgToPng = (...args) => new Promise((resolve) => {
  deferredConverter = deferredConverter.then(async (converter) => {
    const buffer = await converter.convert(...args);
    resolve(buffer);
    return converter;
  });
});

const readSvg = (name) => fs.promises.readFile(`src/ui/icons/${ name }.svg`, 'utf8');

const writeTrayIcon = (name, data) => {
  console.log({ name });
  return fs.promises.writeFile(`src/public/images/tray/${ name }`, data);
};

const writeAppImage = (name, data) => {
  console.log({ name });
  return fs.promises.writeFile(`src/public/images/${ name }`, data);
};

const writeBuildFile = (name, data) => {
  console.log({ name });
  return fs.promises.writeFile(`build/${ name }`, data);
};

const createDarwinTrayIcon = async ({ src, dest, dark = false }) => {
  const svg = (await readSvg(`${ dark ? 'white' : 'black' }/${ src }`))
    .replace('viewBox="0 0 64 64"', 'viewBox="0 0 64 64" transform="scale(0.8)"');

  const [png24, png48] = await Promise.all([
    convertSvgToPng(svg, { width: 24, height: 24 }),
    convertSvgToPng(svg, { width: 24, height: 24, scale: 2 }),
  ]);

  writeTrayIcon(`${ dark ? 'darwin-dark' : 'darwin' }/${ dest }.png`, png24);
  writeTrayIcon(`${ dark ? 'darwin-dark' : 'darwin' }/${ dest }@2x.png`, png48);
};

const createLinuxTrayIcon = async ({ src, dest }) => {
  const svg = await readSvg(`grey/${ src }`);

  const [png24, png48] = await Promise.all([
    convertSvgToPng(svg, { width: 64, height: 64 }),
    convertSvgToPng(svg, { width: 64, height: 64, scale: 2 }),
  ]);

  writeTrayIcon(`linux/${ dest }.png`, png24);
  writeTrayIcon(`linux/${ dest }@2x.png`, png48);
};

const createWindowsTrayIcon = async ({ src, dest }) => {
  const smallSrc = src.startsWith('notification-') ? 'notification-dot' : src;

  const [smallSvg, svg] = await Promise.all([
    readSvg(`grey/${ smallSrc }`),
    readSvg(`grey/${ src }`),
  ]);

  const ico = await convertToIco(await Promise.all([
    convertSvgToPng(smallSvg, { width: 16, height: 16 }),
    convertSvgToPng(smallSvg, { width: 24, height: 24 }),
    convertSvgToPng(svg, { width: 32, height: 32 }),
    convertSvgToPng(svg, { width: 48, height: 48 }),
    convertSvgToPng(svg, { width: 64, height: 64 }),
    convertSvgToPng(svg, { width: 128, height: 128 }),
    convertSvgToPng(svg, { width: 256, height: 256 }),
  ]));

  writeTrayIcon(`win32/${ dest }.ico`, ico);
};

const createAppIcon = async () => {
  const svg = await readSvg('icon');

  const [
    png16,
    png24,
    png32,
    png44,
    png48,
    png50,
    png64,
    png128,
    png150,
    png310v150,
    png256,
    png512,
    png1024,
  ] = [
    await convertSvgToPng(svg, { width: 16, height: 16 }),
    await convertSvgToPng(svg, { width: 24, height: 24 }),
    await convertSvgToPng(svg, { width: 32, height: 32 }),
    await convertSvgToPng(svg, { width: 44, height: 44 }),
    await convertSvgToPng(svg, { width: 48, height: 48 }),
    await convertSvgToPng(svg, { width: 50, height: 50 }),
    await convertSvgToPng(svg, { width: 64, height: 64 }),
    await convertSvgToPng(svg, { width: 128, height: 128 }),
    await convertSvgToPng(svg, { width: 150, height: 150 }),
    await convertSvgToPng(svg, { width: 310, height: 150 }),
    await convertSvgToPng(svg, { width: 256, height: 256 }),
    await convertSvgToPng(svg, { width: 512, height: 512 }),
    await convertSvgToPng(svg, { width: 1024, height: 1024 }),
  ];

  const [ico, icns] = await Promise.all([
    convertToIco([png16, png24, png32, png48, png64, png128, png256]),
    convertToIcns([png1024, png512, png256, png128, png64, png32, png16]),
  ]);

  writeAppImage('icon.png', png64);
  writeAppImage('icon@2x.png', png128);
  writeBuildFile('icon.ico', ico);
  writeBuildFile('icon.icns', icns);
  writeBuildFile('installerIcon.ico', ico);
  writeBuildFile('uninstallerIcon.ico', ico);
  writeBuildFile('appx/Square44x44Logo.png', png44);
  writeBuildFile('appx/Square150x150Logo.png', png150);
  writeBuildFile('appx/StoreLogo.png', png50);
  writeBuildFile('appx/Wide310x150Logo.png', png310v150);
  writeBuildFile('icons/512x512.png', png512);
};

const buildIcons = async () => {
  await promisify(rimraf)('src/public/images/tray');

  await Promise.all([
    fs.promises.mkdir('src/public/images/tray/darwin', { recursive: true }),
    fs.promises.mkdir('src/public/images/tray/darwin-dark', { recursive: true }),
    fs.promises.mkdir('src/public/images/tray/linux', { recursive: true }),
    fs.promises.mkdir('src/public/images/tray/win32', { recursive: true }),
  ]);

  await createDarwinTrayIcon({ src: 'default', dest: 'default' });
  await createDarwinTrayIcon({ src: 'notification-dot', dest: 'notification' });

  await createDarwinTrayIcon({ src: 'default', dest: 'default', dark: true });
  await createDarwinTrayIcon({ src: 'notification-dot', dest: 'notification', dark: true });

  await createLinuxTrayIcon({ src: 'default', dest: 'default' });
  await createLinuxTrayIcon({ src: 'notification-dot', dest: 'notification-dot' });
  await createLinuxTrayIcon({ src: 'notification-1', dest: 'notification-1' });
  await createLinuxTrayIcon({ src: 'notification-2', dest: 'notification-2' });
  await createLinuxTrayIcon({ src: 'notification-3', dest: 'notification-3' });
  await createLinuxTrayIcon({ src: 'notification-4', dest: 'notification-4' });
  await createLinuxTrayIcon({ src: 'notification-5', dest: 'notification-5' });
  await createLinuxTrayIcon({ src: 'notification-6', dest: 'notification-6' });
  await createLinuxTrayIcon({ src: 'notification-7', dest: 'notification-7' });
  await createLinuxTrayIcon({ src: 'notification-8', dest: 'notification-8' });
  await createLinuxTrayIcon({ src: 'notification-9', dest: 'notification-9' });
  await createLinuxTrayIcon({ src: 'notification-plus-9', dest: 'notification-plus-9' });

  await createWindowsTrayIcon({ src: 'default', dest: 'default' });
  await createWindowsTrayIcon({ src: 'notification-dot', dest: 'notification-dot' });
  await createWindowsTrayIcon({ src: 'notification-1', dest: 'notification-1' });
  await createWindowsTrayIcon({ src: 'notification-2', dest: 'notification-2' });
  await createWindowsTrayIcon({ src: 'notification-3', dest: 'notification-3' });
  await createWindowsTrayIcon({ src: 'notification-4', dest: 'notification-4' });
  await createWindowsTrayIcon({ src: 'notification-5', dest: 'notification-5' });
  await createWindowsTrayIcon({ src: 'notification-6', dest: 'notification-6' });
  await createWindowsTrayIcon({ src: 'notification-7', dest: 'notification-7' });
  await createWindowsTrayIcon({ src: 'notification-8', dest: 'notification-8' });
  await createWindowsTrayIcon({ src: 'notification-9', dest: 'notification-9' });
  await createWindowsTrayIcon({ src: 'notification-plus-9', dest: 'notification-plus-9' });

  await createAppIcon();

  const converter = await deferredConverter;
  converter.destroy();
};

if (require.main === module) {
  buildIcons();
}
