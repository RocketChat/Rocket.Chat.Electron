import { webFrame } from 'electron';

import { invoke } from '../scripts/ipc';

export default async () => {
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
