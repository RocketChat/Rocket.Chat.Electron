import { webFrame } from 'electron';

import { invoke } from '../scripts/ipc';

const setupFallbackDictionaries = async () => {
	if (await invoke('spell-checking/get-enabled-dictionaries').length > 0) {
		return;
	}

	const userLanguage = localStorage.getItem('userLanguage');
	if (userLanguage && await invoke('spell-checking/enable-dictionaries', userLanguage)) {
		return;
	}

	const navigatorLanguage = navigator.language;
	if (navigatorLanguage && await invoke('spell-checking/enable-dictionaries', navigatorLanguage)) {
		return;
	}

	await invoke('spell-checking/enable-dictionaries', 'en_US');
};

export default async () => {
	await setupFallbackDictionaries();

	webFrame.setSpellCheckProvider('', {
		spellCheck: async (words, callback) => {
			try {
				const mispelledWords = await invoke('spell-checking/get-misspelled-words', words);
				callback(mispelledWords);
			} catch (error) {
				console.error(error);
				callback([]);
			}
		},
	});
};
