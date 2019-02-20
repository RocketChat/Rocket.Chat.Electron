import { app as mainApp, remote } from 'electron';
import jetpack from 'fs-jetpack';
import util from 'util';


const app = mainApp || remote.app;
const defaultLocale = 'en';
let globalLocale = defaultLocale;
const translations = {};

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

function loadTranslation(locale) {
	if (translations[locale]) {
		return;
	}

	const translation = jetpack.read(`${ app.getAppPath() }/app/i18n/lang/${ locale }.i18n.json`, 'json');

	if (typeof translation !== 'object') {
		return;
	}

	translations[locale] = translation;
}

function initialize() {
	globalLocale = normalizeLocale(app.getLocale());

	loadTranslation(defaultLocale);
	loadTranslation(globalLocale);
}

function translate(phrase, ...replacements) {
	const translation = (translations[globalLocale] && translations[globalLocale][phrase]) ||
		(translations[defaultLocale] && translations[defaultLocale][phrase]) ||
		phrase;

	if (typeof replacements[0] === 'object') {
		const variables = replacements[0];
		const replaceVariable = (match, variableName) => variables[variableName];
		const interpolated = translation.replace(/{{- (.*?)}}/g, replaceVariable)
			.replace(/{{(.*?)}}/g, replaceVariable);

		return interpolated;
	}

	return util.format(translation, ...replacements);
}

app.isReady() ? initialize() : app.whenReady().then(initialize);

export default {
	__: translate,
};
