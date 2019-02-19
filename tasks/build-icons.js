const { convert } = require('convert-svg-to-png');
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
		const lightSvg = await jetpack.readAsync(`src/icons/grey/${ srcName }.svg`);

		const light1x = await convert(lightSvg, { width: 64, height: 64 });
		const light2x = await convert(lightSvg, { width: 64, height: 64, scale: 2 });

		await jetpack.writeAsync(`src/public/images/tray/linux/${ destName }.png`, light1x);
		await jetpack.writeAsync(`src/public/images/tray/linux/${ destName }@2x.png`, light2x);
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

gulp.task('icons', async() => {
	await buildDarwinIcons();
	await buildLinuxIcons();
});
