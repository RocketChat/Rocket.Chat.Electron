const fs = require('fs');
const { promisify } = require('util');

const { convert: convertToIcns } = require('@fiahfy/icns-convert');
const { convert: convertSvgToPng } = require('convert-svg-to-png');
const { parallel, series, task } = require('gulp');
const execa = require('gulp-execa');
const toIco = require('to-ico');
const rimraf = require('rimraf');


const NODE_ENV = process.env.NODE_ENV || 'development';

task('clean', () => promisify(rimraf)('app'));

task('build', execa.task('rollup -c', { env: { NODE_ENV } }));
task('watch', execa.task('rollup -c -w', { env: { NODE_ENV } }));

task('test:build', execa.task('rollup -c', { env: { NODE_ENV: 'test' } }));
task('test:renderer', execa.task('xvfb-maybe electron-mocha --require source-map-support/register --renderer app/renderer.specs/*.js'));

task('test', series('clean', 'test:build', 'test:renderer'));
task('start:electron', execa.task('electron .'));
task('start', series('build', parallel('watch', 'start:electron')));

task('release:linux', execa.task(`electron-builder --publish ${ NODE_ENV === 'production' ? 'onTagOrDraft' : 'never' } --x64 --linux --c.productName=rocketchat`));
task('release:win32', execa.task(`electron-builder --publish ${ NODE_ENV === 'production' ? 'onTagOrDraft' : 'never' } --x64 --ia32 --win`));
task('release:darwin:non-mas', execa.task(`electron-builder --publish ${ NODE_ENV === 'production' ? 'onTagOrDraft' : 'never' } --x64 --mac dmg pkg zip`));
// task('release:darwin:mas', execa.task(`electron-builder --publish ${ NODE_ENV === 'production' ? 'onTagOrDraft' : 'never' } --x64 --mac mas`));
task('release:darwin', series('release:darwin:non-mas'/* , 'release:darwin:mas' */));
task('release', series('build', `release:${ process.platform }`));

task('icons:clean', async () => {
	await promisify(rimraf)('src/public/images/tray/darwin');
	await promisify(rimraf)('src/public/images/tray/darwin-dark');
	await promisify(rimraf)('src/public/images/tray/linux');
	await promisify(rimraf)('src/public/images/tray/win32');
});

const createDarwinTrayIcon = ({ src, dest, dark = false }) => async () => {
	const svg = (await fs.promises.readFile(`src/icons/${ dark ? 'white' : 'black' }/${ src }.svg`, 'utf8'))
		.replace('viewBox="0 0 64 64"', 'viewBox="0 0 64 64" transform="scale(0.8)"');

	const png24 = await convertSvgToPng(svg, { width: 24, height: 24 });
	const png48 = await convertSvgToPng(svg, { width: 24, height: 24, scale: 2 });

	await fs.promises.mkdir(`src/public/images/tray/${ dark ? 'darwin-dark' : 'darwin' }`, { recursive: true });
	await fs.promises.writeFile(`src/public/images/tray/${ dark ? 'darwin-dark' : 'darwin' }/${ dest }.png`, png24);
	await fs.promises.writeFile(`src/public/images/tray/${ dark ? 'darwin-dark' : 'darwin' }/${ dest }@2x.png`, png48);
};

task('icons:darwin:default', createDarwinTrayIcon({ src: 'default', dest: 'default' }));
task('icons:darwin:notification', createDarwinTrayIcon({ src: 'notification-dot', dest: 'notification' }));
task('icons:darwin', series('icons:darwin:default', 'icons:darwin:notification'));

task('icons:darwin-dark:default', createDarwinTrayIcon({ src: 'default', dest: 'default', dark: true }));
task('icons:darwin-dark:notification', createDarwinTrayIcon({ src: 'notification-dot', dest: 'notification', dark: true }));
task('icons:darwin-dark', series('icons:darwin-dark:default', 'icons:darwin-dark:notification'));

const createLinuxTrayIcon = ({ src, dest }) => async () => {
	const svg = await fs.promises.readFile(`src/icons/grey/${ src }.svg`, 'utf8');

	const png24 = await convertSvgToPng(svg, { width: 64, height: 64 });
	const png48 = await convertSvgToPng(svg, { width: 64, height: 64, scale: 2 });

	await fs.promises.mkdir('src/public/images/tray/linux', { recursive: true });
	await fs.promises.writeFile(`src/public/images/tray/linux/${ dest }.png`, png24);
	await fs.promises.writeFile(`src/public/images/tray/linux/${ dest }@2x.png`, png48);
};

task('icons:linux:default', createLinuxTrayIcon({ src: 'default', dest: 'default' }));
task('icons:linux:notification-dot', createLinuxTrayIcon({ src: 'notification-dot', dest: 'notification-dot' }));
task('icons:linux:notification-1', createLinuxTrayIcon({ src: 'notification-1', dest: 'notification-1' }));
task('icons:linux:notification-2', createLinuxTrayIcon({ src: 'notification-2', dest: 'notification-2' }));
task('icons:linux:notification-3', createLinuxTrayIcon({ src: 'notification-3', dest: 'notification-3' }));
task('icons:linux:notification-4', createLinuxTrayIcon({ src: 'notification-4', dest: 'notification-4' }));
task('icons:linux:notification-5', createLinuxTrayIcon({ src: 'notification-5', dest: 'notification-5' }));
task('icons:linux:notification-6', createLinuxTrayIcon({ src: 'notification-6', dest: 'notification-6' }));
task('icons:linux:notification-7', createLinuxTrayIcon({ src: 'notification-7', dest: 'notification-7' }));
task('icons:linux:notification-8', createLinuxTrayIcon({ src: 'notification-8', dest: 'notification-8' }));
task('icons:linux:notification-9', createLinuxTrayIcon({ src: 'notification-9', dest: 'notification-9' }));
task('icons:linux:notification-plus-9', createLinuxTrayIcon({ src: 'notification-plus-9', dest: 'notification-plus-9' }));
task('icons:linux', series(
	'icons:linux:default',
	'icons:linux:notification-dot',
	'icons:linux:notification-1',
	'icons:linux:notification-2',
	'icons:linux:notification-3',
	'icons:linux:notification-4',
	'icons:linux:notification-5',
	'icons:linux:notification-6',
	'icons:linux:notification-7',
	'icons:linux:notification-8',
	'icons:linux:notification-9',
	'icons:linux:notification-plus-9',
));

const createWindowsTrayIcon = ({ src, dest }) => async () => {
	const smallSrc = src.startsWith('notification-') ? 'notification-dot' : src;
	const smallSvg = await fs.promises.readFile(`src/icons/grey/${ smallSrc }.svg`, 'utf8');
	const svg = await fs.promises.readFile(`src/icons/grey/${ src }.svg`, 'utf8');

	const png16 = await convertSvgToPng(smallSvg, { width: 16, height: 16 });
	const png24 = await convertSvgToPng(smallSvg, { width: 24, height: 24 });
	const png32 = await convertSvgToPng(svg, { width: 32, height: 32 });
	const png48 = await convertSvgToPng(svg, { width: 48, height: 48 });
	const png64 = await convertSvgToPng(svg, { width: 64, height: 64 });
	const png128 = await convertSvgToPng(svg, { width: 128, height: 128 });
	const png256 = await convertSvgToPng(svg, { width: 256, height: 256 });
	const ico = await toIco([png16, png24, png32, png48, png64, png128, png256]);

	await fs.promises.mkdir('src/public/images/tray/win32', { recursive: true });
	await fs.promises.writeFile(`src/public/images/tray/win32/${ dest }.ico`, ico);
};

task('icons:win32:default', createWindowsTrayIcon({ src: 'default', dest: 'default' }));
task('icons:win32:notification-dot', createWindowsTrayIcon({ src: 'notification-dot', dest: 'notification-dot' }));
task('icons:win32:notification-1', createWindowsTrayIcon({ src: 'notification-1', dest: 'notification-1' }));
task('icons:win32:notification-2', createWindowsTrayIcon({ src: 'notification-2', dest: 'notification-2' }));
task('icons:win32:notification-3', createWindowsTrayIcon({ src: 'notification-3', dest: 'notification-3' }));
task('icons:win32:notification-4', createWindowsTrayIcon({ src: 'notification-4', dest: 'notification-4' }));
task('icons:win32:notification-5', createWindowsTrayIcon({ src: 'notification-5', dest: 'notification-5' }));
task('icons:win32:notification-6', createWindowsTrayIcon({ src: 'notification-6', dest: 'notification-6' }));
task('icons:win32:notification-7', createWindowsTrayIcon({ src: 'notification-7', dest: 'notification-7' }));
task('icons:win32:notification-8', createWindowsTrayIcon({ src: 'notification-8', dest: 'notification-8' }));
task('icons:win32:notification-9', createWindowsTrayIcon({ src: 'notification-9', dest: 'notification-9' }));
task('icons:win32:notification-plus-9', createWindowsTrayIcon({ src: 'notification-plus-9', dest: 'notification-plus-9' }));
task('icons:win32', series(
	'icons:win32:default',
	'icons:win32:notification-dot',
	'icons:win32:notification-1',
	'icons:win32:notification-2',
	'icons:win32:notification-3',
	'icons:win32:notification-4',
	'icons:win32:notification-5',
	'icons:win32:notification-6',
	'icons:win32:notification-7',
	'icons:win32:notification-8',
	'icons:win32:notification-9',
	'icons:win32:notification-plus-9',
));

task('icons:app', async () => {
	const svg = await fs.promises.readFile('src/icons/icon.svg', 'utf8');

	const png16 = await convertSvgToPng(svg, { width: 16, height: 16 });
	const png24 = await convertSvgToPng(svg, { width: 24, height: 24 });
	const png32 = await convertSvgToPng(svg, { width: 32, height: 32 });
	const png44 = await convertSvgToPng(svg, { width: 44, height: 44 });
	const png48 = await convertSvgToPng(svg, { width: 48, height: 48 });
	const png50 = await convertSvgToPng(svg, { width: 50, height: 50 });
	const png64 = await convertSvgToPng(svg, { width: 64, height: 64 });
	const png128 = await convertSvgToPng(svg, { width: 128, height: 128 });
	const png150 = await convertSvgToPng(svg, { width: 150, height: 150 });
	const png310v150 = await convertSvgToPng(svg, { width: 310, height: 150 });
	const png256 = await convertSvgToPng(svg, { width: 256, height: 256 });
	const png512 = await convertSvgToPng(svg, { width: 512, height: 512 });
	const png1024 = await convertSvgToPng(svg, { width: 1024, height: 1024 });
	const ico = await toIco([png16, png24, png32, png48, png64, png128, png256]);
	const icns = await convertToIcns([png1024, png512, png256, png128, png64, png32, png16]);

	await fs.promises.writeFile('src/public/images/icon.png', png64);
	await fs.promises.writeFile('src/public/images/icon@2x.png', png128);
	await fs.promises.writeFile('build/icon.ico', ico);
	await fs.promises.writeFile('build/icon.icns', icns);
	await fs.promises.writeFile('build/installerIcon.ico', ico);
	await fs.promises.writeFile('build/uninstallerIcon.ico', ico);
	await fs.promises.writeFile('build/appx/Square44x44Logo.png', png44);
	await fs.promises.writeFile('build/appx/Square150x150Logo.png', png150);
	await fs.promises.writeFile('build/appx/StoreLogo.png', png50);
	await fs.promises.writeFile('build/appx/Wide310x150Logo.png', png310v150);
	await fs.promises.writeFile('build/icons/512x512.png', png512);
});

task('icons', series(
	'icons:clean',
	parallel(
		'icons:darwin',
		'icons:darwin-dark',
		'icons:linux',
		'icons:win32',
		'icons:app',
	),
));
