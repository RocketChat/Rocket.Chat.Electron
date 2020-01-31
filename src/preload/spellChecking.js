import { webFrame, ipcRenderer } from 'electron';

const requests = new Map();

export default async () => {
	webFrame.setSpellCheckProvider('', {
		spellCheck: async (words, callback) => {
			const id = JSON.stringify(words);
			ipcRenderer.sendToHost('get-misspelled-words', words);
			requests.set(id, callback);
		},
	});

	ipcRenderer.addListener('misspelled-words', (_, id, misspeledWords) => {
		if (requests.has(id)) {
			requests.get(id)(misspeledWords);
		}
	});
};
