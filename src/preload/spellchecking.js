import { remote, webFrame } from 'electron';
import jetpack from 'fs-jetpack';
import path from 'path';
import spellchecker from 'spellchecker';
const { app } = remote;


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

		if (this.enable('en_US')) {
			return;
		}
	}

	filterDictionaries(...dictionaries) {
		return dictionaries.map((dictionary) => {
			const matches = /^(\w+?)[-_](\w+)$/.exec(dictionary);

			const dictionaries = matches ?
				[`${ matches[1] }_${ matches[2] }`, `${ matches[1] }-${ matches[2] }`, matches[1]] :
				[dictionary];

			return dictionaries.find((dictionary) => this.dictionaries.includes(dictionary));
		}).filter(Boolean);
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

		return this.enabledDictionaries.length > 0;
	}

	disable(...dictionaries) {
		dictionaries = this.filterDictionaries(dictionaries);

		this.enabledDictionaries = this.enabledDictionaries.filter((dictionary) => !dictionaries.includes(dictionary));
		localStorage.setItem('spellcheckerDictionaries', JSON.stringify(this.enabledDictionaries));
	}

	isCorrect(text) {
		if (!this.enabledDictionaries.length) {
			return true;
		}

		return this.enabledDictionaries.every((dictionary) => {
			spellchecker.setDictionary(dictionary, this.dictionariesPath);
			return !spellchecker.isMisspelled(text);
		});
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
			})
		));
	}

	async installDictionaries(filePaths) {
		for (const filePath of filePaths) {
			const name = filePath.basename(filePath, filePath.extname(filePath));
			const basename = filePath.basename(filePath);
			const newPath = filePath.join(this.dictionariesPath, basename);

			await jetpack.copyAsync(filePath, newPath);

			if (!this.dictionaries.includes(name)) {
				this.dictionaries.push(name);
			}
		}
	}
}

export const spellchecking = new SpellCheck;

export default () => {
	spellchecking.load();

	const spellCheck = (text) => spellchecking.isCorrect(text);
	webFrame.setSpellCheckProvider('', false, { spellCheck });
};
