import fs from 'fs';
import path from 'path';

import { remote, webFrame } from 'electron';
import mem from 'mem';

const { app } = remote;
const spellchecker = remote.require('@felixrieseberg/spellchecker');

let dictionaries = [];
let dictionariesPath = null;
let enabledDictionaries = [];
let isMultiLanguage = false;
let isCorrect = () => true;

function updateChecker() {
	if (enabledDictionaries.length === 0) {
		isCorrect = () => true;
		return;
	}

	if (enabledDictionaries.length === 1) {
		let enabled = false;
		isCorrect = mem((text) => {
			if (!enabled) {
				spellchecker.setDictionary(enabledDictionaries[0], dictionariesPath);
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
			.bind(null, dictionariesPath),
	);

	isCorrect = mem(
		((dictionaries, text) => dictionaries.some((dictionary) => singleDictionaryChecker(dictionary, text)))
			.bind(null, enabledDictionaries),
	);
}

async function loadDictionaries() {
	const embeddedDictionaries = spellchecker.getAvailableDictionaries();
	dictionariesPath = path.join(app.getAppPath(), app.getAppPath().endsWith('app.asar') ? '..' : '.', 'dictionaries');
	dictionaries = (await fs.promises.readdir(dictionariesPath, { encoding: 'utf8' }))
		.filter((filename) => ['.bdic'].includes(path.extname(filename).toLowerCase()))
		.map((filename) => path.basename(filename, path.extname(filename)).replace(/-/, '_'))
		.sort();
	isMultiLanguage = embeddedDictionaries.length > 0 && process.platform !== 'win32';
}

function filterDictionaries(dictionaries) {
	return dictionaries
		.flatMap((dictionary) => {
			const matches = /^(\w+?)[-_](\w+)$/.exec(dictionary);
			return matches
				? [`${ matches[1] }_${ matches[2] }`, `${ matches[1] }-${ matches[2] }`, matches[1]]
				: [dictionary];
		})
		.filter((dictionary) => dictionaries.includes(dictionary));
}

export const getSpellCheckingDictionaries = () => dictionaries;

export const getSpellCheckingDictionariesPath = () => dictionariesPath;

export const getEnabledSpellCheckingDictionaries = () => enabledDictionaries;

export const installSpellCheckingDictionaries = async (filePaths) => {
	await Promise.all(filePaths.map(async (filePath) => {
		const name = path.basename(filePath, path.extname(filePath));
		const basename = path.basename(filePath);
		const newPath = path.join(dictionariesPath, basename);

		await fs.promises.copyFile(filePath, newPath);

		if (!dictionaries.includes(name)) {
			dictionaries.push(name);
		}
	}));
};

export const getSpellCheckingCorrections = (text) => {
	text = text.trim();

	if (text === '' || isCorrect(text)) {
		return null;
	}

	return Array.from(new Set(
		enabledDictionaries.flatMap((language) => {
			spellchecker.setDictionary(language, dictionariesPath);
			return spellchecker.getCorrectionsForMisspelling(text);
		}),
	));
};

export const enableSpellCheckingDictionary = (...dictionaries) => {
	dictionaries = filterDictionaries(dictionaries);

	if (isMultiLanguage) {
		enabledDictionaries = [
			...enabledDictionaries,
			...dictionaries,
		];
	} else {
		enabledDictionaries = [dictionaries[0]];
	}

	localStorage.setItem('spellcheckerDictionaries', JSON.stringify(enabledDictionaries));

	updateChecker();

	return enabledDictionaries.length > 0;
};

export const disableSpellCheckingDictionary = (...dictionaries) => {
	dictionaries = filterDictionaries(dictionaries);

	enabledDictionaries = enabledDictionaries.filter((dictionary) => !dictionaries.includes(dictionary));
	localStorage.setItem('spellcheckerDictionaries', JSON.stringify(enabledDictionaries));

	updateChecker();
};

function setDefaultEnabledDictionaries() {
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
		enableSpellCheckingDictionary(...selectedDictionaries);
		return;
	}

	const userLanguage = localStorage.getItem('userLanguage');
	if (userLanguage && enableSpellCheckingDictionary(userLanguage)) {
		return;
	}

	const navigatorLanguage = navigator.language;
	if (enableSpellCheckingDictionary(navigatorLanguage)) {
		return;
	}

	enableSpellCheckingDictionary('en_US');
}

export default async () => {
	await loadDictionaries();
	setDefaultEnabledDictionaries();

	webFrame.setSpellCheckProvider('', {
		spellCheck: (words, callback) => {
			setTimeout(() => {
				const misspelled = words.filter((word) => !isCorrect(word));
				callback(misspelled);
			}, 0);
		},
	});
};
