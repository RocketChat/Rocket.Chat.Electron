import { webFrame } from 'electron';

import {
	SPELL_CHECKING_MISSPELT_WORDS_REQUESTED,
} from '../actions';
import { request } from '../channels';
import { selectDictionaryName } from '../selectors';

const noopSpellCheckProvider = {
	spellCheck: (words, callback) => callback([]),
};

const remoteSpellCheckProvider = {
	spellCheck: async (words, callback) => {
		const misspeltWords = await request(SPELL_CHECKING_MISSPELT_WORDS_REQUESTED, words);
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

export const setupSpellChecking = async (reduxStore) => {
	let prevSpellCheckingLanguage;
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
