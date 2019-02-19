const { convert } = require('convert-svg-to-png');
const toIco = require('to-ico');
const jetpack = require('fs-jetpack');
const gulp = require('gulp');

async function buildDarwinIcons() {
	const createIcon = async(srcName, destName) => {
		const lightSvg = (await jetpack.readAsync(`src/icons/black/${ srcName }.svg`))
			.replace('viewBox="0 0 64 64"', 'viewBox="0 0 64 64" transform="scale(0.8)"');
		const darkSvg = (await jetpack.readAsync(`src/icons/white/${ srcName }.svg`))
			.replace('viewBox="0 0 64 64"', 'viewBox="0 0 64 64" transform="scale(0.8)"');

		const light1x = await convert(lightSvg, { width: 24, height: 24 });
		const light2x = await convert(lightSvg, { width: 24, height: 24, scale: 2 });
		const dark1x = await convert(darkSvg, { width: 24, height: 24 });
		const dark2x = await convert(darkSvg, { width: 24, height: 24, scale: 2 });

		await jetpack.writeAsync(`src/public/images/tray/darwin/${ destName }.png`, light1x);
		await jetpack.writeAsync(`src/public/images/tray/darwin/${ destName }@2x.png`, light2x);
		await jetpack.writeAsync(`src/public/images/tray/darwin-dark/${ destName }.png`, dark1x);
		await jetpack.writeAsync(`src/public/images/tray/darwin-dark/${ destName }@2x.png`, dark2x);
	};

	await jetpack.removeAsync('src/public/images/tray/darwin');
	await jetpack.removeAsync('src/public/images/tray/darwin-dark');

	await createIcon('default', 'default');
	await createIcon('notification-dot', 'notification');
}

async function buildLinuxIcons() {
	const createIcon = async(srcName, destName) => {
		const svg = await jetpack.readAsync(`src/icons/grey/${ srcName }.svg`);

		const png1x = await convert(svg, { width: 64, height: 64 });
		const png2x = await convert(svg, { width: 64, height: 64, scale: 2 });

		await jetpack.writeAsync(`src/public/images/tray/linux/${ destName }.png`, png1x);
		await jetpack.writeAsync(`src/public/images/tray/linux/${ destName }@2x.png`, png2x);
	};

	await jetpack.removeAsync('src/public/images/tray/linux');

	await createIcon('default', 'default');
	await createIcon('notification-dot', 'notification-dot');
	await createIcon('notification-1', 'notification-1');
	await createIcon('notification-2', 'notification-2');
	await createIcon('notification-3', 'notification-3');
	await createIcon('notification-4', 'notification-4');
	await createIcon('notification-5', 'notification-5');
	await createIcon('notification-6', 'notification-6');
	await createIcon('notification-7', 'notification-7');
	await createIcon('notification-8', 'notification-8');
	await createIcon('notification-9', 'notification-9');
	await createIcon('notification-plus-9', 'notification-plus-9');
}

async function buildWindowsIcons() {
	const createIcon = async(smallSrcName, srcName, destName) => {
		const smallSvg = await jetpack.readAsync(`src/icons/grey/${ smallSrcName }.svg`);
		const svg = await jetpack.readAsync(`src/icons/grey/${ srcName }.svg`);

		const png16 = await convert(smallSvg, { width: 16, height: 16 });
		const png24 = await convert(smallSvg, { width: 24, height: 24 });
		const png32 = await convert(svg, { width: 32, height: 32 });
		const png48 = await convert(svg, { width: 48, height: 48 });
		const png64 = await convert(svg, { width: 64, height: 64 });
		const png128 = await convert(svg, { width: 128, height: 128 });

		const ico = await toIco([png16, png24, png32, png48, png64, png128]);
		await jetpack.writeAsync(`src/public/images/tray/win32/${ destName }.ico`, ico);
	};

	await jetpack.removeAsync('src/public/images/tray/win32');

	await createIcon('default', 'default', 'default');
	await createIcon('notification-dot', 'notification-dot', 'notification-dot');
	await createIcon('notification-dot', 'notification-1', 'notification-1');
	await createIcon('notification-dot', 'notification-2', 'notification-2');
	await createIcon('notification-dot', 'notification-3', 'notification-3');
	await createIcon('notification-dot', 'notification-4', 'notification-4');
	await createIcon('notification-dot', 'notification-5', 'notification-5');
	await createIcon('notification-dot', 'notification-6', 'notification-6');
	await createIcon('notification-dot', 'notification-7', 'notification-7');
	await createIcon('notification-dot', 'notification-8', 'notification-8');
	await createIcon('notification-dot', 'notification-9', 'notification-9');
	await createIcon('notification-dot', 'notification-plus-9', 'notification-plus-9');
}

gulp.task('icons', async() => {
	await buildDarwinIcons();
	await buildLinuxIcons();
	await buildWindowsIcons();
});
