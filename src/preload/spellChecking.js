import { webFrame, ipcRenderer } from 'electron';

const requests = new Map();

export default async () => {
	ipcRenderer.addListener('misspelled-words', (_, id, misspeledWords) => {
		if (requests.has(id)) {
			requests.get(id)(misspeledWords);
		}
	});

	ipcRenderer.addListener('set-spell-checking-language', (_, language) => {
		if (language === null) {
			webFrame.setSpellCheckProvider('', {
				spellCheck: (_, callback) => callback([]),
			});
			return;
		}

		webFrame.setSpellCheckProvider(language, {
			spellCheck: async (words, callback) => {
				const id = JSON.stringify(words);
				ipcRenderer.sendToHost('get-misspelled-words', words);
				requests.set(id, callback);
			},
		});
	});
};
