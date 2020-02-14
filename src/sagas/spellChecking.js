import fs from 'fs';
import path from 'path';

import { remote } from 'electron';
import { SpellCheckerProvider } from 'electron-hunspell';
import { all, call, put, select, takeEvery } from 'redux-saga/effects';

import {
	SPELL_CHECKING_DICTIONARIES_UPDATED,
	SPELL_CHECKING_READY,
	WEBVIEW_SPELL_CHECKING_DICTIONARY_FILES_CHOSEN,
	WEBVIEW_SPELL_CHECKING_DICTIONARY_TOGGLED,
} from '../actions';
import { readFromStorage, writeToStorage } from '../localStorage';
import { getConfigurationPath } from '../sagaUtils';

const provider = new SpellCheckerProvider();
const spellCheckers = new Map();

const loadSpellCheckingDictionariesFromFiles = async (filePaths) => {
	try {
		return Object.values(
			filePaths
				.filter((filePath) => /^\.(dic|aff)$/.test(path.extname(filePath)))
				.reduce((obj, filePath) => {
					const extension = path.extname(filePath);
					const name = path.basename(filePath, extension);
					const type = extension.slice(1);
					return {
						...obj,
						[name]: {
							name,
							...obj[name],
							[type]: filePath,
						},
					};
				}, {}),
		)
			.filter(({ aff, dic }) => aff && dic);
	} catch (error) {
		console.warn(error);
		return [];
	}
};

const loadSpellCheckingDictionariesFromDirectory = async (dictionariesDirectoryPath) => {
	try {
		const filePaths = (await fs.promises.readdir(dictionariesDirectoryPath))
			.map((filename) => path.join(dictionariesDirectoryPath, filename));
		return await loadSpellCheckingDictionariesFromFiles(filePaths);
	} catch (error) {
		console.warn(error);
		return [];
	}
};

function *loadSpellCheckingDictionaries() {
	const embeddedDictionaries = ['de', 'en-GB', 'en-US', 'es-ES', 'fr', 'pt-BR', 'tr', 'ru'].map((name) => ({
		name,
		aff: path.join(require.resolve(`dictionary-${ name.toLowerCase() }/package.json`), '../index.aff'),
		dic: path.join(require.resolve(`dictionary-${ name.toLowerCase() }/package.json`), '../index.dic'),
	}));

	const appDictionariesDirectoryPath = getConfigurationPath('dictionaries', { appData: true });
	const userDictionariesDirectoryPath = getConfigurationPath('dictionaries', { appData: false });

	yield call(::fs.promises.mkdir, userDictionariesDirectoryPath, { recursive: true });

	const [appDictionaries, userDictionaries] = yield all([
		call(loadSpellCheckingDictionariesFromDirectory, appDictionariesDirectoryPath),
		call(loadSpellCheckingDictionariesFromDirectory, userDictionariesDirectoryPath),
	]);

	const prevSpellCheckingDictionaries = yield select(({ spellCheckingDictionaries }) => spellCheckingDictionaries);

	const enabledDictionaries = readFromStorage('enabledSpellCheckingDictionaries', [remote.app.getLocale()]);

	return [
		...prevSpellCheckingDictionaries,
		...embeddedDictionaries,
		...appDictionaries,
		...userDictionaries,
	]
		.reduce((dictionaries, dictionary) => {
			const replaced = dictionaries.find(({ name }) => name === dictionary.name);
			if (!replaced) {
				return [...dictionaries, { ...dictionary, enabled: enabledDictionaries.includes(dictionary.name) }];
			}

			const replacer = { ...dictionary, enabled: replaced.enabled };

			return dictionaries.map((dictionary) => (dictionary === replaced ? replacer : dictionary));
		}, []);
}

function *toggleDictionary({ name, enabled, dic, aff }) {
	if (!enabled) {
		spellCheckers.delete(name);
		yield call(::provider.unloadDictionary, name);
		return;
	}

	if (spellCheckers.has(name)) {
		return;
	}

	try {
		const [dicBuffer, affBuffer] = yield all([
			call(::fs.promises.readFile, dic),
			call(::fs.promises.readFile, aff),
		]);

		yield call(::provider.loadDictionary, name, dicBuffer, affBuffer);
		spellCheckers.set(name, provider.spellCheckerTable[name].spellChecker);
	} catch (error) {
		console.error(error);
	}
}

function *takeEvents() {
	yield takeEvery(WEBVIEW_SPELL_CHECKING_DICTIONARY_TOGGLED, function *() {
		const spellCheckingDictionaries = yield select(({ spellCheckingDictionaries }) => spellCheckingDictionaries);
		yield all(spellCheckingDictionaries.map(toggleDictionary));
		writeToStorage('enabledSpellCheckingDictionaries', Array.from(spellCheckers.keys()));
	});

	yield takeEvery(WEBVIEW_SPELL_CHECKING_DICTIONARY_FILES_CHOSEN, function *({ payload: filePaths }) {
		const userDictionariesDirectoryPath = getConfigurationPath('dictionaries', { appData: false });

		const newFilesPaths = yield all(
			filePaths.map((filePath) => call(function *() {
				const basename = path.basename(filePath);
				const newPath = path.join(userDictionariesDirectoryPath, basename);

				try {
					yield call(::fs.promises.copyFile, filePath, newPath);
				} catch (error) {
					console.warn(error);
				}

				return newPath;
			})),
		);

		const installedDictionaries = yield call(loadSpellCheckingDictionariesFromFiles, newFilesPaths);
		const prevSpellCheckingDictionaries = yield select(({ spellCheckingDictionaries }) => spellCheckingDictionaries);

		const spellCheckingDictionaries = [...prevSpellCheckingDictionaries, ...installedDictionaries]
			.reduce((dictionaries, dictionary) => {
				const replaced = dictionaries.find(({ name }) => name === dictionary.name);
				if (!replaced) {
					return [...dictionaries, dictionary];
				}

				const replacer = { ...dictionary, enabled: replaced.enabled };

				return dictionaries.map((dictionary) => (dictionary === replaced ? replacer : dictionary));
			}, []);

		yield put({ type: SPELL_CHECKING_DICTIONARIES_UPDATED, payload: spellCheckingDictionaries });
	});
}

export function *spellCheckingSaga() {
	const installedSpellCheckingDictionariesDirectoryPath = getConfigurationPath('dictionaries', { appData: false });
	const spellCheckingDictionaries = yield *loadSpellCheckingDictionaries();

	yield call(::provider.initialize);
	spellCheckers.clear();
	yield all(spellCheckingDictionaries.map(toggleDictionary));

	yield put({
		type: SPELL_CHECKING_READY,
		payload: {
			installedSpellCheckingDictionariesDirectoryPath,
			spellCheckingDictionaries,
		},
	});

	yield *takeEvents();
}

const isMisspelled = (word) => {
	if (spellCheckers.size === 0) {
		return false;
	}

	return Array.from(spellCheckers.values())
		.every((spellChecker) => !spellChecker.spell(word));
};

export function *getMisspelledWords(words) {
	return words.filter(isMisspelled);
}

export function *getCorrectionsForMisspelling(text) {
	text = text.trim();

	if (!text || spellCheckers.size === 0 || !isMisspelled(text)) {
		return null;
	}

	return Array.from(spellCheckers.values()).flatMap((spellChecker) => spellChecker.suggest(text));
}
