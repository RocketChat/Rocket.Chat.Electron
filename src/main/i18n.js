import path from 'path';

import { app } from 'electron';
import i18next from 'i18next';
import i18nextNodeFileSystemBackend from 'i18next-node-fs-backend';

const defaultLocale = 'en';

const normalizeLocale = (locale) => {
	let [languageCode, countryCode] = locale.split ? locale.split(/[-_]/) : [];
	if (!languageCode || languageCode.length !== 2) {
		return defaultLocale;
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
	await app.whenReady();

	await i18next
		.use(i18nextNodeFileSystemBackend)
		.init({
			lng: normalizeLocale(app.getLocale()),
			fallbackLng: defaultLocale,
			backend: {
				loadPath: path.join(app.getAppPath(), 'app/i18n/{{lng}}.i18n.json'),
			},
			interpolation: {
				format: (value, format, lng) => {
					if (value instanceof Date) {
						return new Intl.DateTimeFormat(lng).format(value);
					}

					return value;
				},
			},
			initImmediate: true,
		});
};
