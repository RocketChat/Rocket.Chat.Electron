import path from 'path';
import fs from 'fs';
import util from 'util';
import { app, remote } from 'electron';

const eApp = app || remote.app;

class I18n {
    constructor () {
        const dir = path.join(__dirname, '../i18n/lang');
        let locale = path.join(dir, `${eApp.getLocale()}.json`);
        if (!fs.existsSync(locale)) {
            locale = path.join(dir, 'en.json');
        }
        this.loadedLanguage = JSON.parse(fs.readFileSync(locale, 'utf8'));
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
