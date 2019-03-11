const { convert } = require('convert-svg-to-png');
const jetpack = require('fs-jetpack');
const gulp = require('gulp');
const toIco = require('to-ico');
const icnsConvert = require('@fiahfy/icns-convert');


gulp.task('icons:clean', async() => {
	await jetpack.removeAsync('src/public/images/tray/darwin');
	await jetpack.removeAsync('src/public/images/tray/darwin-dark');
	await jetpack.removeAsync('src/public/images/tray/linux');
	await jetpack.removeAsync('src/public/images/tray/win32');
});

const createDarwinTrayIcon = ({ src, dest, dark = false }) => async() => {
	const svg = (await jetpack.readAsync(`src/icons/${ dark ? 'white' : 'black' }/${ src }.svg`))
		.replace('viewBox="0 0 64 64"', 'viewBox="0 0 64 64" transform="scale(0.8)"');

	const png24 = await convert(svg, { width: 24, height: 24 });
	const png48 = await convert(svg, { width: 24, height: 24, scale: 2 });

	await jetpack.writeAsync(`src/public/images/tray/${ dark ? 'darwin-dark' : 'darwin' }/${ dest }.png`, png24);
	await jetpack.writeAsync(`src/public/images/tray/${ dark ? 'darwin-dark' : 'darwin' }/${ dest }@2x.png`, png48);
};

gulp.task('icons:darwin:default', createDarwinTrayIcon({ src: 'default', dest: 'default' }));
gulp.task('icons:darwin:notification', createDarwinTrayIcon({ src: 'notification-dot', dest: 'notification' }));
gulp.task('icons:darwin', gulp.series('icons:darwin:default', 'icons:darwin:notification'));

gulp.task('icons:darwin-dark:default', createDarwinTrayIcon({ src: 'default', dest: 'default', dark: true }));
gulp.task('icons:darwin-dark:notification', createDarwinTrayIcon({ src: 'notification-dot', dest: 'notification', dark: true }));
gulp.task('icons:darwin-dark', gulp.series('icons:darwin-dark:default', 'icons:darwin-dark:notification'));

const createLinuxTrayIcon = ({ src, dest }) => async() => {
	const svg = await jetpack.readAsync(`src/icons/grey/${ src }.svg`);

	const png24 = await convert(svg, { width: 64, height: 64 });
	const png48 = await convert(svg, { width: 64, height: 64, scale: 2 });

	await jetpack.writeAsync(`src/public/images/tray/linux/${ dest }.png`, png24);
	await jetpack.writeAsync(`src/public/images/tray/linux/${ dest }@2x.png`, png48);
};

gulp.task('icons:linux:default', createLinuxTrayIcon({ src: 'default', dest: 'default' }));
gulp.task('icons:linux:notification-dot', createLinuxTrayIcon({ src: 'notification-dot', dest: 'notification-dot' }));
gulp.task('icons:linux:notification-1', createLinuxTrayIcon({ src: 'notification-1', dest: 'notification-1' }));
gulp.task('icons:linux:notification-2', createLinuxTrayIcon({ src: 'notification-2', dest: 'notification-2' }));
gulp.task('icons:linux:notification-3', createLinuxTrayIcon({ src: 'notification-3', dest: 'notification-3' }));
gulp.task('icons:linux:notification-4', createLinuxTrayIcon({ src: 'notification-4', dest: 'notification-4' }));
gulp.task('icons:linux:notification-5', createLinuxTrayIcon({ src: 'notification-5', dest: 'notification-5' }));
gulp.task('icons:linux:notification-6', createLinuxTrayIcon({ src: 'notification-6', dest: 'notification-6' }));
gulp.task('icons:linux:notification-7', createLinuxTrayIcon({ src: 'notification-7', dest: 'notification-7' }));
gulp.task('icons:linux:notification-8', createLinuxTrayIcon({ src: 'notification-8', dest: 'notification-8' }));
gulp.task('icons:linux:notification-9', createLinuxTrayIcon({ src: 'notification-9', dest: 'notification-9' }));
gulp.task('icons:linux:notification-plus-9', createLinuxTrayIcon({ src: 'notification-plus-9', dest: 'notification-plus-9' }));
gulp.task('icons:linux', gulp.series(
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

const createWindowsTrayIcon = ({ src, dest }) => async() => {
	const smallSrc = src.startsWith('notification-') ? 'notification-dot' : src;
	const smallSvg = await jetpack.readAsync(`src/icons/grey/${ smallSrc }.svg`);
	const svg = await jetpack.readAsync(`src/icons/grey/${ src }.svg`);

	const png16 = await convert(smallSvg, { width: 16, height: 16 });
	const png24 = await convert(smallSvg, { width: 24, height: 24 });
	const png32 = await convert(svg, { width: 32, height: 32 });
	const png48 = await convert(svg, { width: 48, height: 48 });
	const png64 = await convert(svg, { width: 64, height: 64 });
	const png128 = await convert(svg, { width: 128, height: 128 });
	const png256 = await convert(svg, { width: 256, height: 256 });
	const ico = await toIco([png16, png24, png32, png48, png64, png128, png256]);

	await jetpack.writeAsync(`src/public/images/tray/win32/${ dest }.ico`, ico);
};

gulp.task('icons:win32:default', createWindowsTrayIcon({ src: 'default', dest: 'default' }));
gulp.task('icons:win32:notification-dot', createWindowsTrayIcon({ src: 'notification-dot', dest: 'notification-dot' }));
gulp.task('icons:win32:notification-1', createWindowsTrayIcon({ src: 'notification-1', dest: 'notification-1' }));
gulp.task('icons:win32:notification-2', createWindowsTrayIcon({ src: 'notification-2', dest: 'notification-2' }));
gulp.task('icons:win32:notification-3', createWindowsTrayIcon({ src: 'notification-3', dest: 'notification-3' }));
gulp.task('icons:win32:notification-4', createWindowsTrayIcon({ src: 'notification-4', dest: 'notification-4' }));
gulp.task('icons:win32:notification-5', createWindowsTrayIcon({ src: 'notification-5', dest: 'notification-5' }));
gulp.task('icons:win32:notification-6', createWindowsTrayIcon({ src: 'notification-6', dest: 'notification-6' }));
gulp.task('icons:win32:notification-7', createWindowsTrayIcon({ src: 'notification-7', dest: 'notification-7' }));
gulp.task('icons:win32:notification-8', createWindowsTrayIcon({ src: 'notification-8', dest: 'notification-8' }));
gulp.task('icons:win32:notification-9', createWindowsTrayIcon({ src: 'notification-9', dest: 'notification-9' }));
gulp.task('icons:win32:notification-plus-9', createWindowsTrayIcon({ src: 'notification-plus-9', dest: 'notification-plus-9' }));
gulp.task('icons:win32', gulp.series(
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

gulp.task('icons:app', async() => {
	const svg = await jetpack.readAsync('src/icons/icon.svg');

	const png16 = await convert(svg, { width: 16, height: 16 });
	const png24 = await convert(svg, { width: 24, height: 24 });
	const png32 = await convert(svg, { width: 32, height: 32 });
	const png44 = await convert(svg, { width: 44, height: 44 });
	const png48 = await convert(svg, { width: 48, height: 48 });
	const png50 = await convert(svg, { width: 50, height: 50 });
	const png64 = await convert(svg, { width: 64, height: 64 });
	const png128 = await convert(svg, { width: 128, height: 128 });
	const png150 = await convert(svg, { width: 150, height: 150 });
	const png310v150 = await convert(svg, { width: 310, height: 150 });
	const png256 = await convert(svg, { width: 256, height: 256 });
	const png512 = await convert(svg, { width: 512, height: 512 });
	const png1024 = await convert(svg, { width: 1024, height: 1024 });
	const ico = await toIco([png16, png24, png32, png48, png64, png128, png256]);
	const icns = await icnsConvert([png1024, png512, png256, png128, png64, png32, png16]);

	await jetpack.writeAsync('src/public/images/icon.png', png64);
	await jetpack.writeAsync('src/public/images/icon@2x.png', png128);
	await jetpack.writeAsync('build/icon.ico', ico);
	await jetpack.writeAsync('build/icon.icns', icns);
	await jetpack.writeAsync('build/installerIcon.ico', ico);
	await jetpack.writeAsync('build/uninstallerIcon.ico', ico);
	await jetpack.writeAsync('build/appx/Square44x44Logo.png', png44);
	await jetpack.writeAsync('build/appx/Square150x150Logo.png', png150);
	await jetpack.writeAsync('build/appx/StoreLogo.png', png50);
	await jetpack.writeAsync('build/appx/Wide310x150Logo.png', png310v150);
	await jetpack.writeAsync('build/icons/512x512.png', png512);
});

gulp.task('icons', gulp.series(
	'icons:clean',
	gulp.parallel(
		'icons:darwin',
		'icons:darwin-dark',
		'icons:linux',
		'icons:win32',
		'icons:app'
	)
));
