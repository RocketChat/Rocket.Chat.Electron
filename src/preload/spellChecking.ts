import { webFrame, Provider } from 'electron';
import { Store } from 'redux';

import {
	SPELL_CHECKING_MISSPELT_WORDS_REQUESTED,
} from '../actions';
import { request } from '../channels';
import { selectDictionaryName } from '../selectors';

const noopSpellCheckProvider: Provider = {
	spellCheck: (_words, callback) => callback([]),
};

const remoteSpellCheckProvider: Provider = {
	spellCheck: async (words, callback) => {
		const misspeltWords: string[] = await request(SPELL_CHECKING_MISSPELT_WORDS_REQUESTED, words);
		callback(misspeltWords);
	},
};

const setSpellCheckProvider = (language: string): void => {
	if (language === null) {
		webFrame.setSpellCheckProvider('', noopSpellCheckProvider);
		return;
	}

	webFrame.setSpellCheckProvider(language, remoteSpellCheckProvider);
};

export const setupSpellChecking = (reduxStore: Store): void => {
	let prevSpellCheckingLanguage: string;
	reduxStore.subscribe(() => {
		const dictionaryName = selectDictionaryName(reduxStore.getState());
		const spellCheckingLanguage = dictionaryName ? dictionaryName.split(/[-_]/g)[0] : null;

		if (prevSpellCheckingLanguage === spellCheckingLanguage) {
			return;
		}
		prevSpellCheckingLanguage = spellCheckingLanguage;
		setSpellCheckProvider(spellCheckingLanguage);
	});
};
