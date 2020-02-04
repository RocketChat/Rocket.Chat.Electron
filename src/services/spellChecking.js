import fs from 'fs';
import path from 'path';

import { remote } from 'electron';
import mem from 'mem';

import { readArrayOf, writeArrayOf } from '../localStorage';

const { Spellchecker, getAvailableDictionaries } = remote.require('@felixrieseberg/spellchecker');

let embeddedDictionaries = [];
let installedDictionariesDirectoryPath = null;
const installedDictionariesExtension = '.bdic';
let installedDictionaries = [];
let availableDictionaries = [];
const spellCheckers = new Map();

const registerSpellChecker = async (dictionaryName) => {
	if (installedDictionaries.includes(dictionaryName)) {
		try {
			const spellChecker = new Spellchecker();
			const dictionaryPath = path.join(
				installedDictionariesDirectoryPath,
				`${ dictionaryName }${ installedDictionariesExtension }`,
			);
			const data = await fs.promises.readFile(dictionaryPath);
			if (!spellChecker.setDictionary(dictionaryName, data)) {
				throw new Error(`Dictionary not loaded: ${ dictionaryName }`);
			}
			spellCheckers.set(dictionaryName, spellChecker);
		} catch (error) {
			console.warn(error.stack);
		}
		return;
	}

	try {
		const spellChecker = new Spellchecker();
		spellChecker.setDictionary(dictionaryName);
		spellCheckers.set(dictionaryName, spellChecker);
	} catch (error) {
		console.warn(error.stack);
	}
};

const tearDown = async () => {
	embeddedDictionaries = [];
	installedDictionariesDirectoryPath = null;
	installedDictionaries = [];
	availableDictionaries = [];
	spellCheckers.clear();
};

const getCorrectionsForMisspelling = mem((text) => {
	text = text.trim();

	if (!text || spellCheckers.size === 0) {
		return [];
	}

	return Array.from(spellCheckers.values()).flatMap((spellChecker) => spellChecker.getCorrectionsForMisspelling(text));
});

const isMisspelled = mem((word) => {
	if (spellCheckers.size === 0) {
		return false;
	}

	return Array.from(spellCheckers.values())
		.every((spellChecker) => spellChecker.isMisspelled(word));
});

const getMisspelledWords = mem((words) => words.filter(isMisspelled));

const updateEnabledDictionaries = () => {
	mem.clear(getCorrectionsForMisspelling);
	mem.clear(isMisspelled);
	mem.clear(getMisspelledWords);
	writeArrayOf(String, 'enabledSpellCheckingDictionaries', Array.from(spellCheckers.keys()));
};

const updateInstalledDictionaries = async () => {
	if (process.platform !== 'darwin') {
		try {
			installedDictionaries = (await fs.promises.readdir(installedDictionariesDirectoryPath, { encoding: 'utf8' }))
				.filter((filename) => path.extname(filename).toLowerCase() === installedDictionariesExtension)
				.map((filename) => path.basename(filename, path.extname(filename)))
				.sort();
		} catch (error) {
			console.warn(error.stack);
			installedDictionaries = [];
		}
	}

	availableDictionaries = Array.from(new Set([...embeddedDictionaries, ...installedDictionaries]));

	for (const dictionaryName of spellCheckers.keys()) {
		if (!availableDictionaries.includes(dictionaryName)) {
			spellCheckers.delete(dictionaryName);
		}
	}
};

const setUp = async () => {
	try {
		embeddedDictionaries = getAvailableDictionaries();
	} catch (error) {
		console.warn(error.stack);
		embeddedDictionaries = [];
	}

	installedDictionariesDirectoryPath = path.join(
		remote.app.getAppPath(),
		remote.app.getAppPath().endsWith('app.asar') ? '..' : '.',
		'dictionaries',
	);

	await updateInstalledDictionaries();

	const defaultDictionaries = availableDictionaries.includes(remote.app.getLocale()) ? [remote.app.getLocale()] : [];

	const enabledDictionaries = readArrayOf(String, 'enabledSpellCheckingDictionaries', defaultDictionaries)
		.filter((dictionaryName) => availableDictionaries.includes(dictionaryName));

	spellCheckers.clear();

	await Promise.all(enabledDictionaries.map(registerSpellChecker));

	updateEnabledDictionaries();
};

const installDictionary = async (sourcePath) => {
	if (process.platform === 'darwin') {
		return;
	}
	const basename = path.basename(sourcePath);
	const targetPath = path.join(installedDictionariesDirectoryPath, basename);

	await fs.promises.copyFile(sourcePath, targetPath);
	await updateInstalledDictionaries();
};

const toggleDictionary = async (dictionaryName, enabled = !spellCheckers.has(dictionaryName)) => {
	if (!enabled) {
		spellCheckers.delete(dictionaryName);
		updateEnabledDictionaries();
		return;
	}

	if (!availableDictionaries.includes(dictionaryName)) {
		return;
	}

	spellCheckers.delete(dictionaryName);
	await registerSpellChecker(dictionaryName);
	updateEnabledDictionaries();
};

export default Object.freeze({
	setUp,
	tearDown,
	getInstalledDictionariesDirectoryPath: () => installedDictionariesDirectoryPath,
	getInstalledDictionariesExtension: () => installedDictionariesExtension,
	installDictionary,
	getAvailableDictionaries: () => availableDictionaries,
	getEnabledDictionaries: () => Array.from(spellCheckers.keys()),
	toggleDictionary,
	getCorrectionsForMisspelling,
	getMisspelledWords,
});
