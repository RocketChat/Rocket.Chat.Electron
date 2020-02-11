import fs from 'fs';
import path from 'path';

import { remote } from 'electron';
import { SpellCheckerProvider } from 'electron-hunspell';
import mem from 'mem';

let provider;

let dictionaries = [];
let dictionariesPath = null;

export const isMisspelled = mem(async (text) => {
	if (!text || (await provider.getAvailableDictionaries()).length === 0) {
		return false;
	}

	const dictionaries = await provider.getAvailableDictionaries();

	for (const dictionary of dictionaries) {
		// eslint-disable-next-line no-await-in-loop
		await provider.onSwitchLanguage(dictionary);
		// eslint-disable-next-line no-await-in-loop
		if (await provider.spell(text)) {
			return false;
		}
	}

	return true;
});

function filterDictionaries(dictionariesToFilter) {
	return dictionariesToFilter
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

export const getEnabledSpellCheckingDictionaries = () => provider.getAvailableDictionaries();

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

export const getMisspelledWords = async (words) => {
	const misspelledWords = [];

	for (const word of words) {
		// eslint-disable-next-line no-await-in-loop
		if (await isMisspelled(word)) {
			misspelledWords.push(word);
		}
	}

	return misspelledWords;
};

export const getSpellCheckingCorrections = async (text) => {
	text = text.trim();

	if (!await isMisspelled(text)) {
		return null;
	}

	const dictionaries = await provider.getAvailableDictionaries();
	const corrections = [];

	for (const dictionary of dictionaries) {
		// eslint-disable-next-line no-await-in-loop
		await provider.onSwitchLanguage(dictionary);
		// eslint-disable-next-line no-await-in-loop
		corrections.push(...await provider.getSuggestion(text));
	}

	return corrections;
};

const registerSpellCheckingDictionary = async (dictionary) => {
	try {
		const dicPath = path.join(dictionariesPath, `${ dictionary.replace(/-/g, '_') }.dic`);
		const affPath = path.join(dictionariesPath, `${ dictionary.replace(/-/g, '_') }.aff`);
		const dicBuffer = await fs.promises.readFile(dicPath);
		const affBuffer = await fs.promises.readFile(affPath);
		await provider.loadDictionary(dictionary, dicBuffer, affBuffer);
	} catch (error) {
		console.error(error);
		await provider.unloadDictionary(dictionary);
	}
};

export const enableSpellCheckingDictionaries = async (...dictionaries) => {
	const filteredDictionaries = filterDictionaries(dictionaries);

	await Promise.all(filteredDictionaries.map(registerSpellCheckingDictionary));

	mem.clear(isMisspelled);

	localStorage.setItem('spellcheckerDictionaries', JSON.stringify(await provider.getAvailableDictionaries()));

	return (await provider.getAvailableDictionaries()).length > 0;
};

export const disableSpellCheckingDictionaries = async (...dictionaries) => {
	const filteredDictionaries = filterDictionaries(dictionaries);

	for (const dictionary of filteredDictionaries) {
		provider.unloadDictionary(dictionary);
	}

	mem.clear(isMisspelled);

	localStorage.setItem('spellcheckerDictionaries', JSON.stringify(await provider.getAvailableDictionaries()));
};

export const setupSpellChecking = async () => {
	provider = new SpellCheckerProvider();

	await provider.initialize();

	const embeddedDictionaries = await provider.getAvailableDictionaries();

	dictionariesPath = path.join(
		remote.app.getAppPath(),
		remote.app.getAppPath().endsWith('app.asar') ? '..' : '.',
		'dictionaries',
	);

	let installedDictionaries = [];
	installedDictionaries = (await fs.promises.readdir(dictionariesPath, { encoding: 'utf8' }))
		.filter((filename) => ['.dic'].includes(path.extname(filename).toLowerCase()))
		.map((filename) => path.basename(filename, path.extname(filename)))
		.sort();

	dictionaries = Array.from(new Set([...embeddedDictionaries, ...installedDictionaries]));

	try {
		const enabledDictionaries = JSON.parse(localStorage.getItem('spellcheckerDictionaries')) || [];
		await enableSpellCheckingDictionaries(...enabledDictionaries);
	} catch (error) {
		console.error(error);
	}
};
