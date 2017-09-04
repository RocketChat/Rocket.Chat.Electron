const util = require('util');
const { app, remote } = require('electron');
const lang = require('./lang');

const eApp = app || remote.app;

class I18n {
  /**
   * Load users language if available, and fallback to english for any missing strings
   * @constructor
   */
  constructor() {
    this.loadedLanguage = lang.en;
    const locale = eApp.getLocale().replace(/-([a-z])/g, (m, w) => w.toUpperCase());
    if (lang[locale]) {
      this.loadedLanguage = Object.assign(this.loadedLanguage, lang[locale]);
    }
  }

  /**
   * Get translation string
   * @param {string} phrase The key for the translation string
   * @param {...string|number} replacements List of replacements in template strings
   * @return {string} Translation in users language
   */
  __(phrase, ...replacements) {
    const translation = this.loadedLanguage[phrase] ? this.loadedLanguage[phrase] : phrase;
    return util.format(translation, ...replacements);
  }
}

module.exports = new I18n();
