import fs from 'fs';
import path from 'path';

import { remote } from 'electron';
import mem from 'mem';

const { Spellchecker, getAvailableDictionaries } = remote.require('@felixrieseberg/spellchecker');

let dictionaries = [];
let dictionariesPath = null;
const spellCheckers = new Map();

export const isMisspelled = mem((text) => {
	if (!text || spellCheckers.size === 0) {
		return false;
	}

	for (const spellChecker of spellCheckers.values()) {
		if (!spellChecker.isMisspelled(text)) {
			return false;
		}
	}

	return true;
});

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

export const getEnabledSpellCheckingDictionaries = () => Array.from(spellCheckers.keys());

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

export const getMisspelledWords = (words) => words.filter(isMisspelled);

export const getSpellCheckingCorrections = (text) => {
	text = text.trim();

	if (!isMisspelled(text)) {
		return null;
	}

	return Array.from(spellCheckers.values()).flatMap((spellChecker) => spellChecker.getCorrectionsForMisspelling(text));
};

const registerSpellCheckingDictionary = async (dictionary) => {
	let data;
	try {
		const dictionaryPath = path.join(dictionariesPath, `${ dictionary.replace(/_/g, '-') }.bdic`);
		data = await fs.promises.readFile(dictionaryPath);
	} catch (error) {
		data = Buffer.alloc(0);
	}

	try {
		const spellChecker = new Spellchecker();
		spellChecker.setDictionary(dictionary, data);
		spellCheckers.set(dictionary, spellChecker);
	} catch (error) {
		spellCheckers.delete(dictionary);
	}
};

export const enableSpellCheckingDictionaries = async (...dictionaries) => {
	const filteredDictionaries = filterDictionaries(dictionaries);

	await Promise.all(filteredDictionaries.map(registerSpellCheckingDictionary));

	mem.clear(isMisspelled);

	localStorage.setItem('spellcheckerDictionaries', JSON.stringify(Array.from(spellCheckers.keys())));

	return spellCheckers.size > 0;
};

export const disableSpellCheckingDictionaries = (...dictionaries) => {
	const filteredDictionaries = filterDictionaries(dictionaries);

	for (const dictionary of filteredDictionaries) {
		spellCheckers.delete(dictionary);
	}

	mem.clear(isMisspelled);

	localStorage.setItem('spellcheckerDictionaries', JSON.stringify(Array.from(spellCheckers.keys())));
};

export const setupSpellChecking = async () => {
	const embeddedDictionaries = getAvailableDictionaries();

	dictionariesPath = path.join(
		remote.app.getAppPath(),
		remote.app.getAppPath().endsWith('app.asar') ? '..' : '.',
		'dictionaries',
	);

	const installedDictionaries = (await fs.promises.readdir(dictionariesPath, { encoding: 'utf8' }))
		.filter((filename) => ['.bdic'].includes(path.extname(filename).toLowerCase()))
		.map((filename) => path.basename(filename, path.extname(filename)).replace(/-/, '_'))
		.sort();

	dictionaries = Array.from(new Set([...embeddedDictionaries, ...installedDictionaries]));

	try {
		const enabledDictionaries = JSON.parse(localStorage.getItem('spellcheckerDictionaries')) || [];
		await enableSpellCheckingDictionaries(...enabledDictionaries);
	} catch (error) {
		console.error(error);
	}
};
