import path from 'path';
import fs from 'fs';
import util from 'util';
import { app, remote } from 'electron';

const eApp = app || remote.app;

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
        this.loadedLanguage = JSON.parse(fs.readFileSync(defaultLocale, 'utf8'));
        const locale = path.join(dir, `${eApp.getLocale()}.i18n.json`);
        if (fs.existsSync(locale)) {
            const lang = JSON.parse(fs.readFileSync(locale, 'utf8'));
            this.loadedLanguage = Object.assign(this.loadedLanguage, lang);
        }
    }

    /**
     * Get translation string
     * @param {string} phrase The key for the translation string
     * @param {...string|number} replacements List of replacements in template strings
     * @return {string} Translation in users language
     */
    __ (phrase, ...replacements) {
        const translation = this.loadedLanguage[phrase] ? this.loadedLanguage[phrase] : phrase;
        return util.format(translation, ...replacements);
    }
}

export default new I18n();
