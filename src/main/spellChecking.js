import fs from 'fs';
import path from 'path';

import { app, ipcMain, webContents } from 'electron';
import { SpellCheckerProvider } from 'electron-hunspell';

import {
	SPELL_CHECKING_DICTIONARIES_UPDATED,
	PERSISTABLE_VALUES_MERGED,
} from '../actions';
import {
	QUERY_SPELL_CHECKING_LANGUAGE,
	EVENT_SPELL_CHECKING_LANGUAGE_CHANGED,
	QUERY_MISSPELT_WORDS,
} from '../ipc';
import {
	selectSpellCheckingDictionaries,
	selectPersistableValues,
	selectDictionaryName,
} from '../selectors';

const embeddedDictionaries = [
	{
		name: 'de',
		aff: require.resolve('dictionary-de/index.aff'),
		dic: require.resolve('dictionary-de/index.dic'),
	},
	{
		name: 'en',
		aff: require.resolve('dictionary-en/index.aff'),
		dic: require.resolve('dictionary-en/index.dic'),
	},
	{
		name: 'en-GB',
		aff: require.resolve('dictionary-en-gb/index.aff'),
		dic: require.resolve('dictionary-en-gb/index.dic'),
	},
	{
		name: 'es',
		aff: require.resolve('dictionary-es/index.aff'),
		dic: require.resolve('dictionary-es/index.dic'),
	},
	{
		name: 'fr',
		aff: require.resolve('dictionary-fr/index.aff'),
		dic: require.resolve('dictionary-fr/index.dic'),
	},
	{
		name: 'pt',
		aff: require.resolve('dictionary-pt/index.aff'),
		dic: require.resolve('dictionary-pt/index.dic'),
	},
	{
		name: 'tr',
		aff: require.resolve('dictionary-tr/index.aff'),
		dic: require.resolve('dictionary-tr/index.dic'),
	},
	{
		name: 'ru',
		aff: require.resolve('dictionary-ru/index.aff'),
		dic: require.resolve('dictionary-ru/index.dic'),
	},
];

const getConfigurationPath = (filePath, { appData = true } = {}) => path.join(
	...appData ? [
		app.getAppPath(),
		app.getAppPath().endsWith('app.asar') ? '..' : '.',
	] : [app.getPath('userData')],
	filePath,
);

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

const loadSpellCheckingDictionaries = async (reduxStore) => {
	const appDictionariesDirectoryPath = getConfigurationPath('dictionaries', { appData: true });
	const userDictionariesDirectoryPath = getConfigurationPath('dictionaries', { appData: false });

	await fs.promises.mkdir(userDictionariesDirectoryPath, { recursive: true });

	const [appDictionaries, userDictionaries] = await Promise.all([
		loadSpellCheckingDictionariesFromDirectory(appDictionariesDirectoryPath),
		loadSpellCheckingDictionariesFromDirectory(userDictionariesDirectoryPath),
	]);

	const prevSpellCheckingDictionaries = selectSpellCheckingDictionaries(reduxStore.getState());

	const enabledDictionaries = prevSpellCheckingDictionaries.filter(({ enabled }) => enabled).map(({ name }) => name);
	if (enabledDictionaries.length === 0) {
		enabledDictionaries.push(app.getLocale().replace('_', '-'));
		enabledDictionaries.push(app.getLocale().replace('-', '_'));
	}

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
};

const toggleDictionary = async ({ name, enabled, dic, aff }) => {
	if (!enabled) {
		spellCheckers.delete(name);
		await provider.unloadDictionary(name);
		return;
	}

	if (spellCheckers.has(name)) {
		return;
	}

	try {
		const [dicBuffer, affBuffer] = await Promise.all([
			fs.promises.readFile(dic),
			fs.promises.readFile(aff),
		]);

		await provider.loadDictionary(name, dicBuffer, affBuffer);
		spellCheckers.set(name, provider.spellCheckerTable[name].spellChecker);
	} catch (error) {
		console.error(error);
	}
};

const isMisspelled = (word) => {
	if (spellCheckers.size === 0) {
		return false;
	}

	return Array.from(spellCheckers.values())
		.every((spellChecker) => !spellChecker.spell(word));
};

export const getCorrectionsForMisspelling = async (text) => {
	text = text.trim();

	if (!text || spellCheckers.size === 0 || !isMisspelled(text)) {
		return null;
	}

	return Array.from(spellCheckers.values()).flatMap((spellChecker) => spellChecker.suggest(text));
};

export const getMisspelledWords = async (words) => words.filter(isMisspelled);

export const importSpellCheckingDictionaries = async (reduxStore, filePaths) => {
	const userDictionariesDirectoryPath = getConfigurationPath('dictionaries', { appData: false });

	const newFilesPaths = await Promise.all(
		filePaths.map(async (filePath) => {
			const basename = path.basename(filePath);
			const newPath = path.join(userDictionariesDirectoryPath, basename);

			try {
				await fs.promises.copyFile(filePath, newPath);
			} catch (error) {
				console.warn(error);
			}

			return newPath;
		}),
	);

	const installedDictionaries = await loadSpellCheckingDictionariesFromFiles(newFilesPaths);
	const prevSpellCheckingDictionaries = selectSpellCheckingDictionaries(reduxStore.getState());

	const spellCheckingDictionaries = [...prevSpellCheckingDictionaries, ...installedDictionaries]
		.reduce((dictionaries, dictionary) => {
			const replaced = dictionaries.find(({ name }) => name === dictionary.name);
			if (!replaced) {
				return [...dictionaries, dictionary];
			}

			const replacer = { ...dictionary, enabled: replaced.enabled };

			return dictionaries.map((dictionary) => (dictionary === replaced ? replacer : dictionary));
		}, []);

	reduxStore.dispatch({ type: SPELL_CHECKING_DICTIONARIES_UPDATED, payload: spellCheckingDictionaries });
};

export const setupSpellChecking = async (reduxStore, localStorage) => {
	if (localStorage.enabledSpellCheckingDictionaries) {
		try {
			const enabledSpellCheckingDictionaries = JSON.parse(localStorage.enabledSpellCheckingDictionaries);

			const initialSpellCheckingDictionaries = selectSpellCheckingDictionaries(reduxStore.getState());

			const spellCheckingDictionaries = initialSpellCheckingDictionaries.map((spellCheckingDictionary) => {
				if (enabledSpellCheckingDictionaries.includes(spellCheckingDictionary.name)) {
					return { ...spellCheckingDictionary, enabled: true };
				}

				return spellCheckingDictionary;
			});

			const persistableValues = selectPersistableValues(reduxStore.getState());
			reduxStore.dispatch({ type: PERSISTABLE_VALUES_MERGED, payload: { ...persistableValues, spellCheckingDictionaries } });
		} catch (error) {
			console.error(error);
		}
	}

	const spellCheckingDictionaries = await loadSpellCheckingDictionaries(reduxStore);

	await provider.initialize();
	spellCheckers.clear();
	await Promise.all(spellCheckingDictionaries.map(toggleDictionary));

	reduxStore.dispatch({
		type: PERSISTABLE_VALUES_MERGED,
		payload: {
			spellCheckingDictionaries,
		},
	});

	reduxStore.subscribe(() => {
		const spellCheckingDictionaries = selectSpellCheckingDictionaries(reduxStore.getState());
		spellCheckingDictionaries.map((dictionary) => toggleDictionary(dictionary));
	});

	let prevDictionaryName;
	reduxStore.subscribe(() => {
		const dictionaryName = selectDictionaryName(reduxStore.getState());
		if (prevDictionaryName !== dictionaryName) {
			webContents.getAllWebContents().forEach((webContents) => {
				webContents.send(EVENT_SPELL_CHECKING_LANGUAGE_CHANGED, dictionaryName);
			});
			prevDictionaryName = dictionaryName;
		}
	});

	ipcMain.handle(QUERY_SPELL_CHECKING_LANGUAGE, () => {
		const dictionaryName = selectDictionaryName(reduxStore.getState());
		const language = dictionaryName ? dictionaryName.split(/[-_]/g)[0] : null;
		return language;
	});

	ipcMain.handle(QUERY_MISSPELT_WORDS, async (event, words) => {
		const misspeltWords = await getMisspelledWords(words);
		return misspeltWords;
	});
};
