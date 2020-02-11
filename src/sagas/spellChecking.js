import fs from 'fs';
import path from 'path';

import { remote } from 'electron';
import { SpellCheckerProvider } from 'electron-hunspell';
import { all, call, put, select, takeEvery } from 'redux-saga/effects';

import {
	SPELL_CHECKING_DICTIONARY_ADDED,
	SPELL_CHECKING_ERROR_THROWN,
	SPELL_CHECKING_PARAMETERS_SET,
	SPELL_CHECKING_READY,
	WEBVIEW_SPELL_CHECKING_DICTIONARY_FILES_CHOSEN,
	WEBVIEW_SPELL_CHECKING_DICTIONARY_TOGGLED,
} from '../actions';
import { readArrayOf, writeArrayOf } from '../localStorage';

const provider = new SpellCheckerProvider();

const spellCheckers = new Map();

const getCorrectionsForMisspelling = (text) => {
	text = text.trim();

	if (!text || spellCheckers.size === 0) {
		return [];
	}

	return Array.from(spellCheckers.values()).flatMap((spellChecker) => spellChecker.suggest(text));
};

const isMisspelled = (word) => {
	if (spellCheckers.size === 0) {
		return false;
	}

	return Array.from(spellCheckers.values())
		.every((spellChecker) => !spellChecker.spell(word));
};

const getMisspelledWords = (words) => words.filter(isMisspelled);

const loadConfiguration = async () => {
	const appDictionariesDirectoryPath = path.join(
		remote.app.getAppPath(),
		remote.app.getAppPath().endsWith('app.asar') ? '..' : '.',
		'dictionaries',
	);

	const userDictionariesDirectoryPath = path.join(
		remote.app.getPath('userData'),
		'dictionaries',
	);

	let installedDictionaries = [];

	try {
		installedDictionaries = [
			...(await fs.promises.readdir(appDictionariesDirectoryPath, { encoding: 'utf8' }))
				.filter((filename) => path.extname(filename).toLowerCase() === '.dic')
				.map((filename) => path.basename(filename, path.extname(filename))),
			...(await fs.promises.readdir(userDictionariesDirectoryPath, { encoding: 'utf8' }))
				.filter((filename) => path.extname(filename).toLowerCase() === '.dic')
				.map((filename) => path.basename(filename, path.extname(filename))),
		]
			.sort();
	} catch (error) {
		console.warn(error.stack);
	}

	const availableDictionaries = Array.from(new Set(installedDictionaries));

	const defaultDictionaries = availableDictionaries.includes(remote.app.getLocale()) ? [remote.app.getLocale()] : [];

	const enabledDictionaries = readArrayOf(String, 'enabledSpellCheckingDictionaries', defaultDictionaries)
		.filter((dictionaryName) => availableDictionaries.includes(dictionaryName));

	const spellCheckingDictionaries = availableDictionaries.map((dictionaryName) => ({
		name: dictionaryName,
		installed: true,
		enabled: enabledDictionaries.includes(dictionaryName),
	}));

	return {
		isHunspellSpellCheckerUsed: true,
		installedSpellCheckingDictionariesDirectoryPath: userDictionariesDirectoryPath,
		spellCheckingDictionaries,
	};
};

function *toggleDictionary({ name, enabled }) {
	if (!enabled) {
		spellCheckers.delete(name);
		provider.unloadDictionary(name);
		return;
	}

	try {
		const appDictionariesDirectoryPath = path.join(
			remote.app.getAppPath(),
			remote.app.getAppPath().endsWith('app.asar') ? '..' : '.',
			'dictionaries',
		);

		const userDictionariesDirectoryPath = yield select(({
			installedSpellCheckingDictionariesDirectoryPath,
		}) => installedSpellCheckingDictionariesDirectoryPath);

		const dicPath = (yield call(::Promise.all, [
			path.join(userDictionariesDirectoryPath, `${ name }.dic`),
			path.join(appDictionariesDirectoryPath, `${ name }.dic`),
		].map(async (filePath) => [filePath, await fs.promises.stat(filePath).then((stat) => stat.isFile(), () => false)])))
			.filter(([, exists]) => exists)
			.map(([filePath]) => filePath)[0];

		const affPath = (yield call(::Promise.all, [
			path.join(userDictionariesDirectoryPath, `${ name }.aff`),
			path.join(appDictionariesDirectoryPath, `${ name }.aff`),
		].map(async (filePath) => [filePath, await fs.promises.stat(filePath).then((stat) => stat.isFile(), () => false)])))
			.filter(([, exists]) => exists)
			.map(([filePath]) => filePath)[0];

		const [dicBuffer, affBuffer] = yield all([
			call(::fs.promises.readFile, dicPath),
			call(::fs.promises.readFile, affPath),
		]);

		yield call(::provider.loadDictionary, name, dicBuffer, affBuffer);
		spellCheckers.set(name, provider.spellCheckerTable[name].spellChecker);
	} catch (error) {
		console.error(error.stack);
	}
}

function *updateSpellCheckers(spellCheckingDictionaries) {
	yield all(spellCheckingDictionaries.map(toggleDictionary));
}

export function *getCorrectionsForMisspellingSaga(text) {
	return yield call(getCorrectionsForMisspelling, text);
}

export function *getMisspelledWordsSaga(words) {
	return yield call(getMisspelledWords, words);
}

export function *spellCheckingSaga() {
	const {
		isHunspellSpellCheckerUsed,
		installedSpellCheckingDictionariesDirectoryPath,
		spellCheckingDictionaries,
	} = yield call(loadConfiguration);

	spellCheckers.clear();

	yield put({
		type: SPELL_CHECKING_PARAMETERS_SET,
		payload: {
			isHunspellSpellCheckerUsed,
			installedSpellCheckingDictionariesDirectoryPath,
		},
	});

	yield call(::provider.initialize);

	yield *updateSpellCheckers(spellCheckingDictionaries);

	yield put({
		type: SPELL_CHECKING_READY,
		payload: {
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

		yield call(::fs.promises.mkdir, installedSpellCheckingDictionariesDirectoryPath, { recursive: true });

		const pairs = Object.entries(
			filePaths
				.filter((filePath) => ['.dic', '.aff'].includes(path.extname(filePath).toLowerCase()))
				.reduce((obj, filePath) => {
					const extension = path.extname(filePath);
					const dictionaryName = path.basename(filePath, path.extname(filePath));
					return {
						...obj,
						[dictionaryName]: {
							...obj[dictionaryName],
							[extension.slice(1).toLowerCase()]: filePath,
						},
					};
				}, {}),
		)
			.filter(([, { aff, dic }]) => aff && dic)
			.sort(([a], [b]) => a.localeCompare(b));

		yield all(pairs.map(function *([dictionaryName, { aff, dic }]) {
			try {
				yield all([
					call(::fs.promises.copyFile, aff, path.join(installedSpellCheckingDictionariesDirectoryPath, `${ dictionaryName }.aff`)),
					call(::fs.promises.copyFile, dic, path.join(installedSpellCheckingDictionariesDirectoryPath, `${ dictionaryName }.dic`)),
				]);
				yield put({ type: SPELL_CHECKING_DICTIONARY_ADDED, payload: dictionaryName });
			} catch (error) {
				yield put({ type: SPELL_CHECKING_ERROR_THROWN, payload: error });
			}
		}));
	});
}
