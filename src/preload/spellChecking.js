import { ipcRenderer, webFrame } from 'electron';

import {
	QUERY_MISSPELT_WORDS,
	QUERY_SPELL_CHECKING_LANGUAGE,
	EVENT_SPELL_CHECKING_LANGUAGE_CHANGED,
} from '../ipc';

const noopSpellCheckProvider = {
	spellCheck: (words, callback) => callback([]),
};

const remoteSpellCheckProvider = {
	spellCheck: async (words, callback) => {
		const misspeltWords = await ipcRenderer.invoke(QUERY_MISSPELT_WORDS, words);
		callback(misspeltWords);
	},
};

const setSpellCheckProvider = (language) => {
	if (language === null) {
		webFrame.setSpellCheckProvider('', noopSpellCheckProvider);
		return;
	}

	webFrame.setSpellCheckProvider(language, remoteSpellCheckProvider);
};

export const setupSpellChecking = async () => {
	ipcRenderer.addListener(EVENT_SPELL_CHECKING_LANGUAGE_CHANGED, (event, spellCheckingLanguage) => {
		setSpellCheckProvider(spellCheckingLanguage);
	});

	const spellCheckingLanguage = await ipcRenderer.invoke(QUERY_SPELL_CHECKING_LANGUAGE);
	setSpellCheckProvider(spellCheckingLanguage);
};
