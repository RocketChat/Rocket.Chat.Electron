import fs from 'fs';
import path from 'path';

import { remote } from 'electron';
import { SpellCheckerProvider } from 'electron-hunspell';

let provider;

let availableDictionaries = new Map();
let userDictionariesPath = null;

export const isMisspelled = async (text) => {
	if (!text || (await provider.getAvailableDictionaries()).length === 0) {
		return false;
	}

	return !(await provider.getAvailableDictionaries())
		.some((dictionaryName) => provider.spellCheckerTable[dictionaryName].spellChecker.spell(text));
};

function filterDictionaries(dictionariesToFilter) {
	return dictionariesToFilter
		.flatMap((dictionary) => {
			const matches = /^(\w+?)[-_](\w+)$/.exec(dictionary);
			return matches
				? [`${ matches[1] }_${ matches[2] }`, `${ matches[1] }-${ matches[2] }`, matches[1]]
				: [dictionary];
		})
		.filter((dictionary) => availableDictionaries.has(dictionary));
}

export const getSpellCheckingDictionaries = () => Array.from(availableDictionaries.keys());

export const getSpellCheckingDictionariesPath = () => userDictionariesPath;

export const getEnabledSpellCheckingDictionaries = () => provider.getAvailableDictionaries();

export const installSpellCheckingDictionaries = async (filePaths) => {
	await Promise.all(filePaths.map(async (filePath) => {
		const extension = path.extname(filePath);
		const name = path.basename(filePath, extension);
		const basename = path.basename(filePath);
		const newPath = path.join(userDictionariesPath, basename);

		await fs.promises.copyFile(filePath, newPath);

		if (!availableDictionaries.has(name)) {
			availableDictionaries.set(name, { [extension.slice(1).toLowerCase()]: newPath });
		} else {
			availableDictionaries.get(name)[extension.slice(1).toLowerCase()] = newPath;
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

	return (await provider.getAvailableDictionaries())
		.flatMap((dictionaryName) => provider.spellCheckerTable[dictionaryName].spellChecker.suggest(text));
};

const registerSpellCheckingDictionary = async (dictionaryName) => {
	try {
		const { dic: dicPath, aff: affPath } = availableDictionaries.get(dictionaryName);
		const [dicBuffer, affBuffer] = await Promise.all([
			fs.promises.readFile(dicPath),
			fs.promises.readFile(affPath),
		]);
		await provider.loadDictionary(dictionaryName, dicBuffer, affBuffer);
	} catch (error) {
		console.error(error);
		await provider.unloadDictionary(dictionaryName);
	}
};

export const enableSpellCheckingDictionaries = async (...dictionaryNames) => {
	const filteredDictionaries = filterDictionaries(dictionaryNames);

	await Promise.all(filteredDictionaries.map(registerSpellCheckingDictionary));

	localStorage.setItem('spellcheckerDictionaries', JSON.stringify(await provider.getAvailableDictionaries()));

	return (await provider.getAvailableDictionaries()).length > 0;
};

export const disableSpellCheckingDictionaries = async (...dictionaryNames) => {
	const filteredDictionaries = filterDictionaries(dictionaryNames);

	filteredDictionaries.forEach((dictionary) => {
		provider.unloadDictionary(dictionary);
	});

	localStorage.setItem('spellcheckerDictionaries', JSON.stringify(await provider.getAvailableDictionaries()));
};

const getPairsOfDictionaryFiles = async (directoryPath) => {
	try {
		return Object.entries(
			(await fs.promises.readdir(directoryPath, { encoding: 'utf8' }))
				.filter((filename) => ['.dic', '.aff'].includes(path.extname(filename).toLowerCase()))
				.reduce((obj, filename) => {
					const extension = path.extname(filename);
					const dictionaryName = path.basename(filename, path.extname(filename));
					return {
						...obj,
						[dictionaryName]: {
							...obj[dictionaryName],
							[extension.slice(1).toLowerCase()]: path.join(directoryPath, filename),
						},
					};
				}, {}),
		)
			.filter(([, { aff, dic }]) => aff && dic)
			.sort(([a], [b]) => a.localeCompare(b));
	} catch (error) {
		console.error(error);
		return [];
	}
};

export const setupSpellChecking = async () => {
	provider = new SpellCheckerProvider();

	await provider.initialize();

	const appDirectoriesPath = path.join(
		remote.app.getAppPath(),
		remote.app.getAppPath().endsWith('app.asar') ? '..' : '.',
		'dictionaries',
	);

	const appDictionaries = await getPairsOfDictionaryFiles(appDirectoriesPath);

	userDictionariesPath = path.join(
		remote.app.getPath('userData'),
		'dictionaries',
	);

	const userDictionaries = await getPairsOfDictionaryFiles(userDictionariesPath);

	availableDictionaries = new Map([...appDictionaries, ...userDictionaries]);

	try {
		const enabledDictionaries = JSON.parse(localStorage.getItem('spellcheckerDictionaries')) || [];
		await enableSpellCheckingDictionaries(...enabledDictionaries);
	} catch (error) {
		console.error(error);
	}
};
