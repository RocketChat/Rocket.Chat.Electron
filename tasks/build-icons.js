const { convert } = require('convert-svg-to-png');
const toIco = require('to-ico');
const icnsConvert = require('@fiahfy/icns-convert');
const jetpack = require('fs-jetpack');


async function buildTrayDarwinIcons() {
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
		console.log(`darwin/${ destName }`);
	};

	await jetpack.removeAsync('src/public/images/tray/darwin');
	await jetpack.removeAsync('src/public/images/tray/darwin-dark');

	await createIcon('default', 'default');
	await createIcon('notification-dot', 'notification');
}

async function buildTrayLinuxIcons() {
	const createIcon = async(srcName, destName) => {
		const svg = await jetpack.readAsync(`src/icons/grey/${ srcName }.svg`);

		const png1x = await convert(svg, { width: 64, height: 64 });
		const png2x = await convert(svg, { width: 64, height: 64, scale: 2 });

		await jetpack.writeAsync(`src/public/images/tray/linux/${ destName }.png`, png1x);
		await jetpack.writeAsync(`src/public/images/tray/linux/${ destName }@2x.png`, png2x);
		console.log(`linux/${ destName }`);
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

async function buildTrayWindowsIcons() {
	const createIcon = async(smallSrcName, srcName, destName) => {
		const smallSvg = await jetpack.readAsync(`src/icons/grey/${ smallSrcName }.svg`);
		const svg = await jetpack.readAsync(`src/icons/grey/${ srcName }.svg`);

		const png16 = await convert(smallSvg, { width: 16, height: 16 });
		const png24 = await convert(smallSvg, { width: 24, height: 24 });
		const png32 = await convert(svg, { width: 32, height: 32 });
		const png48 = await convert(svg, { width: 48, height: 48 });
		const png64 = await convert(svg, { width: 64, height: 64 });
		const png128 = await convert(svg, { width: 128, height: 128 });
		const png256 = await convert(svg, { width: 256, height: 256 });
		const ico = await toIco([png16, png24, png32, png48, png64, png128, png256]);

		await jetpack.writeAsync(`src/public/images/tray/win32/${ destName }.ico`, ico);
		console.log(`win32/${ destName }`);
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

async function buildAppIcon() {
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
	console.log('icon');

	await jetpack.writeAsync('build/icon.ico', ico);
	await jetpack.writeAsync('build/icon.icns', icns);
	await jetpack.writeAsync('build/installerIcon.ico', ico);
	await jetpack.writeAsync('build/uninstallerIcon.ico', ico);
	await jetpack.writeAsync('build/appx/Square44x44Logo.png', png44);
	await jetpack.writeAsync('build/appx/Square150x150Logo.png', png150);
	await jetpack.writeAsync('build/appx/StoreLogo.png', png50);
	await jetpack.writeAsync('build/appx/Wide310x150Logo.png', png310v150);
	await jetpack.writeAsync('build/icons/512x512.png', png512);
	console.log('build/icon');
}

(async() => {
	await buildTrayDarwinIcons();
	await buildTrayLinuxIcons();
	await buildTrayWindowsIcons();
	await buildAppIcon();
})();
