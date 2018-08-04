import path from 'path';
import fs from 'fs';
import util from 'util';
import { app, remote } from 'electron';

const eApp = app || remote.app;

let loadedLanguage = [];

/**
 * Load singular and plural translation based on count
 * @param {string} phrase The key fore the translation string
 * @param {number} chount Count to check for singular / plural (0-1,2-n)
 * @returns {string} Translation in user language
 */
function loadTranslation (phrase = '', count) {
    const loadedLanguageTranslation = loadedLanguage[phrase];
    let translation = loadedLanguageTranslation;
    if (loadedLanguageTranslation === undefined) {
        translation = phrase;
    } else if (loadedLanguageTranslation instanceof Object) {
        translation = loadedLanguageTranslation['one'];
        if (count > 1) {
            translation = loadedLanguageTranslation['multi'];
        }
    }
    return translation;
}

class I18n {
    /**
     * Load users language if available, and fallback to english for any missing strings
     * @constructor
     */
    constructor () {
        let dir = path.join(__dirname, '../i18n/lang');
        if (!fs.existsSync(dir)) {
            dir = path.join(__dirname, 'i18n/lang');
        }
        const defaultLocale = path.join(dir, 'en.i18n.json');
        loadedLanguage = JSON.parse(fs.readFileSync(defaultLocale, 'utf8'));
        const locale = path.join(dir, `${eApp.getLocale()}.i18n.json`);
        if (fs.existsSync(locale)) {
            const lang = JSON.parse(fs.readFileSync(locale, 'utf8'));
            loadedLanguage = Object.assign(loadedLanguage, lang);
        }
    }

    /**
     * Get translation string
     * @param {string} phrase The key for the translation string
     * @param {...string|number} replacements List of replacements in template strings
     * @return {string} Translation in users language
     */
    __ (phrase, ...replacements) {
        const translation = loadTranslation(phrase, 0);
        return util.format(translation, ...replacements);
    }

    /**
     * Get translation string
     * @param {string} phrase The key for the translation string
     * @param {number} count Count to check for singular / plural (0-1,2-n)
     * @param {...string|number} replacements List of replacements in template strings
     * @return {string} Translation in users language
     */
    pluralize (phrase, count, ...replacements) {
        const translation = loadTranslation(phrase, count);
        return util.format(translation, ...replacements);
    }
}

export default new I18n();
