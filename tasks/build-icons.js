const { convert } = require('convert-svg-to-png');
const jetpack = require('fs-jetpack');
const gulp = require('gulp');

gulp.task('icons', async() => {
	switch (process.platform) {
		case 'darwin': {
			const createIcon = async(srcName, destName) => {
				console.log(`Building ${ destName } icon...`);
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

			console.log('Purging old icons...');
			await jetpack.removeAsync('src/public/images/tray/darwin');
			await jetpack.removeAsync('src/public/images/tray/darwin-dark');

			await createIcon('default', 'default');
			await createIcon('notification-dot', 'notification');
			break;
		}
	}
});
