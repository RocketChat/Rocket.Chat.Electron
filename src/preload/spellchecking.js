import path from 'path';

import { remote, webFrame } from 'electron';
import jetpack from 'fs-jetpack';
import mem from 'mem';

const { app } = remote;
const spellchecker = remote.require('@felixrieseberg/spellchecker');

class SpellCheck {
	constructor() {
		this.dictionaries = [];
		this.enabledDictionaries = [];
		this.isMultiLanguage = false;
		this.dictionariesPath = null;
	}

	async load() {
		await this.loadDictionaries();
		this.setDefaultEnabledDictionaries();
	}

	async loadDictionaries() {
		const embeddedDictionaries = spellchecker.getAvailableDictionaries();

		const directory = jetpack.cwd(app.getAppPath(), app.getAppPath().endsWith('app.asar') ? '..' : '.', 'dictionaries');
		const installedDictionaries = (await directory.findAsync({ matching: '*.{aff,dic}' }))
			.map((fileName) => path.basename(fileName, path.extname(fileName)));

		this.dictionariesPath = directory.path();
		this.dictionaries = Array.from(new Set([...embeddedDictionaries, ...installedDictionaries])).sort();
		this.isMultiLanguage = embeddedDictionaries.length > 0 && process.platform !== 'win32';
	}

	setDefaultEnabledDictionaries() {
		const selectedDictionaries = (() => {
			try {
				const enabledDictionaries = JSON.parse(localStorage.getItem('spellcheckerDictionaries'));
				return Array.isArray(enabledDictionaries) ? enabledDictionaries.map(String) : null;
			} catch (error) {
				console.error(error);
				return null;
			}
		})();

		if (selectedDictionaries) {
			this.enable(...selectedDictionaries);
			return;
		}

		const userLanguage = localStorage.getItem('userLanguage');
		if (userLanguage && this.enable(this.userLanguage)) {
			return;
		}

		const navigatorLanguage = navigator.language;
		if (this.enable(navigatorLanguage)) {
			return;
		}

		this.enable('en_US');
	}

	filterDictionaries(dictionaries) {
		return dictionaries
			.flatMap((dictionary) => {
				const matches = /^(\w+?)[-_](\w+)$/.exec(dictionary);
				return matches
					? [`${ matches[1] }_${ matches[2] }`, `${ matches[1] }-${ matches[2] }`, matches[1]]
					: [dictionary];
			})
			.filter((dictionary) => this.dictionaries.includes(dictionary));
	}

	enable(...dictionaries) {
		dictionaries = this.filterDictionaries(dictionaries);

		if (this.isMultiLanguage) {
			this.enabledDictionaries = [
				...this.enabledDictionaries,
				...dictionaries,
			];
		} else {
			this.enabledDictionaries = [dictionaries[0]];
		}

		localStorage.setItem('spellcheckerDictionaries', JSON.stringify(this.enabledDictionaries));

		this.updateChecker();

		return this.enabledDictionaries.length > 0;
	}

	disable(...dictionaries) {
		dictionaries = this.filterDictionaries(dictionaries);

		this.enabledDictionaries = this.enabledDictionaries.filter((dictionary) => !dictionaries.includes(dictionary));
		localStorage.setItem('spellcheckerDictionaries', JSON.stringify(this.enabledDictionaries));

		this.updateChecker();
	}

	updateChecker() {
		try {
			if (this.enabledDictionaries.length === 0) {
				this.checker = () => true;
				return;
			}

			if (this.enabledDictionaries.length === 1) {
				let enabled = false;
				this.checker = mem((text) => {
					if (!enabled) {
						spellchecker.setDictionary(this.enabledDictionaries[0], this.dictionariesPath);
						enabled = true;
					}
					return !spellchecker.isMisspelled(text);
				});
				return;
			}

			const singleDictionaryChecker = mem(
				((dictionariesPath, dictionary, text) => {
					spellchecker.setDictionary(dictionary, dictionariesPath);
					return !spellchecker.isMisspelled(text);
				})
					.bind(null, this.dictionariesPath),
			);

			this.checker = mem(
				((dictionaries, text) => dictionaries.some((dictionary) => singleDictionaryChecker(dictionary, text)))
					.bind(null, this.enabledDictionaries),
			);
		} finally {
			webFrame.setSpellCheckProvider('', {
				spellCheck: (words, callback) => {
					setTimeout(() => {
						const misspelled = words.filter((word) => !this.checker(word));
						callback(misspelled);
					}, 0);
				},
			});
		}
	}

	isCorrect(text) {
		return this.checker(text);
	}

	getCorrections(text) {
		text = text.trim();

		if (text === '' || this.isCorrect(text)) {
			return null;
		}

		return Array.from(new Set(
			this.enabledDictionaries.flatMap((language) => {
				spellchecker.setDictionary(language, this.dictionariesPath);
				return spellchecker.getCorrectionsForMisspelling(text);
			}),
		));
	}

	async installDictionaries(filePaths) {
		await Promise.all(filePaths.map(async (filePath) => {
			const name = filePath.basename(filePath, filePath.extname(filePath));
			const basename = filePath.basename(filePath);
			const newPath = filePath.join(this.dictionariesPath, basename);

			await jetpack.copyAsync(filePath, newPath);

			if (!this.dictionaries.includes(name)) {
				this.dictionaries.push(name);
			}
		}));
	}
}

export const spellchecking = new SpellCheck();

export default () => {
	spellchecking.load();
};
