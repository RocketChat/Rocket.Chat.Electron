import fs from 'fs';
import path from 'path';
import os from 'os';

import { remote } from 'electron';
import mem from 'mem';
import { all, call, put, select, take, takeEvery } from 'redux-saga/effects';

import { readArrayOf, writeArrayOf } from '../../localStorage';
import {
	SPELL_CHECKING_DICTIONARY_ADDED,
	SPELL_CHECKING_ERROR_THROWN,
	SPELL_CHECKING_READY,
	WEBVIEW_SPELL_CHECKING_DICTIONARY_FILES_CHOSEN,
	WEBVIEW_SPELL_CHECKING_DICTIONARY_TOGGLED,
} from '../../actions';

const { Spellchecker, getAvailableDictionaries } = remote.require('@felixrieseberg/spellchecker');

const spellCheckers = new Map();

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

const loadConfiguration = async () => {
	const isNSSpellCheckerUsed = os.platform() === 'darwin';
	const isWindowsSpellCheckingAPIUsed = (() => {
		if (os.platform() !== 'win32') {
			return false;
		}

		const [major, minor] = os.release().split('.').map((slice) => parseInt(slice, 10));

		return major >= 6 && minor >= 2;
	})();
	const isHunspellSpellCheckerUsed = !isNSSpellCheckerUsed && !isWindowsSpellCheckingAPIUsed;

	let embeddedDictionaries = [];
	try {
		embeddedDictionaries = getAvailableDictionaries();
	} catch (error) {
		console.warn(error.stack);
	}

	let installedDictionariesDirectoryPath = null;
	let installedDictionaries = [];
	if (isHunspellSpellCheckerUsed) {
		installedDictionariesDirectoryPath = path.join(
			remote.app.getAppPath(),
			remote.app.getAppPath().endsWith('app.asar') ? '..' : '.',
			'dictionaries',
		);

		try {
			installedDictionaries = (await fs.promises.readdir(installedDictionariesDirectoryPath, { encoding: 'utf8' }))
				.filter((filename) => path.extname(filename).toLowerCase() === '.bdic')
				.map((filename) => path.basename(filename, path.extname(filename)))
				.sort();
		} catch (error) {
			console.warn(error.stack);
		}
	}

	const availableDictionaries = Array.from(new Set([...embeddedDictionaries, ...installedDictionaries]));

	const defaultDictionaries = availableDictionaries.includes(remote.app.getLocale()) ? [remote.app.getLocale()] : [];

	const enabledDictionaries = readArrayOf(String, 'enabledSpellCheckingDictionaries', defaultDictionaries)
		.filter((dictionaryName) => availableDictionaries.includes(dictionaryName));

	const spellCheckingDictionaries = availableDictionaries.map((dictionaryName) => ({
		name: dictionaryName,
		installed: installedDictionaries.includes(dictionaryName),
		enabled: enabledDictionaries.includes(dictionaryName),
	}));

	return {
		isHunspellSpellCheckerUsed,
		installedSpellCheckingDictionariesDirectoryPath: installedDictionariesDirectoryPath,
		spellCheckingDictionaries,
	};
};

function *createDictionaryReference({ name, installed }) {
	if (!installed) {
		return [name];
	}

	const {
		installedSpellCheckingDictionariesDirectoryPath,
		installedSpellCheckingDictionariesExtension,
	} = yield select(({
		installedSpellCheckingDictionariesDirectoryPath,
		installedSpellCheckingDictionariesExtension,
	}) => ({
		installedSpellCheckingDictionariesDirectoryPath,
		installedSpellCheckingDictionariesExtension,
	}));

	const dictionaryPath = path.join(
		installedSpellCheckingDictionariesDirectoryPath,
		`${ name }${ installedSpellCheckingDictionariesExtension }`,
	);
	const data = yield call(::fs.promises.readFile, dictionaryPath);

	return [name, data];
}

function *toggleDictionary({ name, enabled, installed }) {
	spellCheckers.delete(name);

	if (!enabled) {
		return;
	}

	try {
		const dictionaryReference = yield *createDictionaryReference({ name, installed });
		const spellChecker = new Spellchecker();
		if (!spellChecker.setDictionary(...dictionaryReference)) {
			throw new Error(`Dictionary not loaded: ${ name }`);
		}
		spellCheckers.set(name, spellChecker);
	} catch (error) {
		yield put({ type: SPELL_CHECKING_ERROR_THROWN, payload: error });
	}
}

function *updateSpellCheckers(spellCheckingDictionaries) {
	yield all(spellCheckingDictionaries.map(toggleDictionary));
	mem.clear(getCorrectionsForMisspelling);
	mem.clear(isMisspelled);
	mem.clear(getMisspelledWords);
}

export function *getCorrectionsForMisspellingSaga(text) {
	return yield call(getCorrectionsForMisspelling, text);
}

export function *getMisspelledWordsSaga(words) {
	return yield call(getMisspelledWords, words);
}

export function *spellCheckingSaga() {
	const cleanUp = async () => {
		window.removeEventListener('beforeunload', cleanUp);
		spellCheckers.clear();
	};

	window.addEventListener('beforeunload', cleanUp);

	try {
		const {
			isHunspellSpellCheckerUsed,
			installedSpellCheckingDictionariesDirectoryPath,
			installedSpellCheckingDictionariesExtension,
			spellCheckingDictionaries,
		} = yield call(loadConfiguration);

		spellCheckers.clear();

		yield *updateSpellCheckers(spellCheckingDictionaries);

		yield put({
			type: SPELL_CHECKING_READY,
			payload: {
				isHunspellSpellCheckerUsed,
				installedSpellCheckingDictionariesDirectoryPath,
				installedSpellCheckingDictionariesExtension,
				spellCheckingDictionaries,
			},
		});

		yield takeEvery(WEBVIEW_SPELL_CHECKING_DICTIONARY_TOGGLED, function *() {
			const spellCheckingDictionaries = yield select(({ spellCheckingDictionaries }) => spellCheckingDictionaries);
			yield *updateSpellCheckers(spellCheckingDictionaries);
			writeArrayOf(String, 'enabledSpellCheckingDictionaries', Array.from(spellCheckers.keys()));
		});

		yield takeEvery(WEBVIEW_SPELL_CHECKING_DICTIONARY_FILES_CHOSEN, function *({ payload: filePaths }) {
			const isHunspellSpellCheckerUsed = yield select(({ isHunspellSpellCheckerUsed }) => isHunspellSpellCheckerUsed);

			if (!isHunspellSpellCheckerUsed) {
				return;
			}

			const installedSpellCheckingDictionariesDirectoryPath = yield select(({
				installedSpellCheckingDictionariesDirectoryPath,
			}) => installedSpellCheckingDictionariesDirectoryPath);

			yield all(filePaths.map(function *(filePath) {
				const basename = path.basename(filePath);
				const targetPath = path.join(installedSpellCheckingDictionariesDirectoryPath, basename);
				try {
					yield call(::fs.promises.copyFile, filePath, targetPath);
					yield put({ type: SPELL_CHECKING_DICTIONARY_ADDED, payload: basename });
				} catch (error) {
					yield call({ type: SPELL_CHECKING_ERROR_THROWN, payload: error });
				}
			}));
		});

		while (true) {
			yield take();
		}
	} catch (error) {
		throw error;
	} finally {
		cleanUp();
	}
}
