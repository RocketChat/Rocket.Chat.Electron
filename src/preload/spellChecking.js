import { ipcRenderer, webFrame } from 'electron';

import {
	INVOKE_MISSPELT_WORDS,
	INVOKE_SPELL_CHECKING_LANGUAGE,
	SEND_SET_SPELL_CHECKING_LANGUAGE,
} from '../ipc';

const setSpellCheckProvider = (language) => {
	if (language === null) {
		webFrame.setSpellCheckProvider('', {
			spellCheck: (_, callback) => callback([]),
		});
		return;
	}

	webFrame.setSpellCheckProvider(language, {
		spellCheck: async (words, callback) => {
			const misspeledWords = await ipcRenderer.invoke(INVOKE_MISSPELT_WORDS, words);
			callback(misspeledWords);
		},
	});
};

export const setupSpellChecking = async () => {
	ipcRenderer.addListener(SEND_SET_SPELL_CHECKING_LANGUAGE, (_, spellCheckingLanguage) => {
		setSpellCheckProvider(spellCheckingLanguage);
	});

	const spellCheckingLanguage = await ipcRenderer.invoke(INVOKE_SPELL_CHECKING_LANGUAGE);
	setSpellCheckProvider(spellCheckingLanguage);
};
