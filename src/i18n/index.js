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

function getTranslation(phrase = '', count) {
	const loadedLanguage = translations[globalLocale] || translations[defaultLocale];
	const loadedLanguageTranslation = loadedLanguage[phrase];
	let translation = loadedLanguageTranslation;

	if (loadedLanguageTranslation === undefined) {
		translation = phrase;
	} else if (loadedLanguageTranslation instanceof Object) {
		translation = loadedLanguageTranslation.zero;
		if (count === 1) {
			translation = loadedLanguageTranslation.one;
		} else if (count > 1) {
			translation = loadedLanguageTranslation.multi;
		}
	}

	return translation;
}

function translate(phrase, count, ...replacements) {
	const translation = getTranslation(phrase, count);
	return util.format(translation, ...replacements);
}

app.isReady() ? initialize() : app.whenReady().then(initialize);

export default {
	__: (phrase, ...replacements) => translate.call(null, phrase, 0, ...replacements),
	pluralize: translate,
};
