import { app as mainApp, remote } from 'electron';
import jetpack from 'fs-jetpack';
import i18next from 'i18next';
import i18nextSyncFileSystemBackend from 'i18next-sync-fs-backend';


const app = mainApp || remote.app;
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

function initialize() {
	globalLocale = normalizeLocale(app.getLocale());

	i18next
		.use(i18nextSyncFileSystemBackend)
		.init({
			lng: globalLocale,
			fallbackLng: defaultLocale,
			lngs: jetpack.list(`${ app.getAppPath() }/app/i18n/lang`)
				.filter((filename) => /^([a-z]{2}(\-[A-Z]{2})?)\.i18n\.json$/.test(filename))
				.map((filename) => filename.split('.')[0]),
			backend: {
				loadPath: `${ app.getAppPath() }/app/i18n/lang/{{lng}}.i18n.json`,
			},
			initImmediate: false,
		});
}

app.isReady() ? initialize() : app.whenReady().then(initialize);

export default {
	__: i18next.t.bind(i18next),
};
