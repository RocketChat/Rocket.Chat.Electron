import { app as mainApp, remote } from 'electron';
import jetpack from 'fs-jetpack';
import util from 'util';


const app = mainApp || remote.app;
const defaultLocale = 'en';
let globalLocale = defaultLocale;
const translations = {};

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
	globalLocale = app.getLocale();

	loadTranslation(defaultLocale);
	loadTranslation(globalLocale);
}

function translate(phrase, ...replacements) {
	const translation = (translations[globalLocale] && translations[globalLocale][phrase]) ||
		(translations[defaultLocale] || translations[defaultLocale][phrase]) ||
		phrase;

	return util.format(translation, ...replacements);
}

app.isReady() ? initialize() : app.whenReady().then(initialize);

export default {
	__: translate,
};
