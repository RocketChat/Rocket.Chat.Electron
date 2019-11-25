import { app as mainApp, remote } from 'electron';
import jetpack from 'fs-jetpack';
import i18next from 'i18next';
import i18nextNodeFileSystemBackend from 'i18next-node-fs-backend';

const app = mainApp || remote.app;
const languagesDirPath = `${ app.getAppPath() }/app/i18n/lang`;
const defaultLocale = 'en';
let globalLocale = defaultLocale;

const normalizeLocale = (locale) => {
	let [languageCode, countryCode] = locale.split ? locale.split(/[-_]/) : [];
	if (!languageCode || languageCode.length !== 2) {
		return 'en';
	}
	languageCode = languageCode.toLowerCase();

	if (!countryCode || countryCode.length !== 2) {
		countryCode = null;
	} else {
		countryCode = countryCode.toUpperCase();
	}

	return countryCode ? `${ languageCode }-${ countryCode }` : languageCode;
};

export const setupI18next = async () => {
	globalLocale = normalizeLocale(app.getLocale());

	const lngFiles = await jetpack.listAsync(languagesDirPath);
	const lngs = lngFiles
		.filter((filename) => /^([a-z]{2}(\-[A-Z]{2})?)\.i18n\.json$/.test(filename))
		.map((filename) => filename.split('.')[0]);

	await i18next
		.use(i18nextNodeFileSystemBackend)
		.init({
			lng: globalLocale,
			fallbackLng: defaultLocale,
			lngs,
			backend: {
				loadPath: `${ languagesDirPath }/{{lng}}.i18n.json`,
			},
			initImmediate: true,
		});
};
