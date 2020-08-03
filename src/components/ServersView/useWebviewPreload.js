import { useEffect } from 'react';
import { useSelector } from 'react-redux';

export const useWebviewPreload = (webviewRef, webContents, { active, failed }) => {
	const visible = active && !failed;

	const dictionaryName = useSelector(({ spellCheckingDictionaries }) =>
		spellCheckingDictionaries.filter(({ enabled }) => enabled).map(({ name }) => name)[0]);

	useEffect(() => {
		if (!webContents || !visible) {
			return;
		}

		const language = dictionaryName ? dictionaryName.split(/[-_]/g)[0] : null;
		webContents.send('set-spell-checking-language', language);
	}, [webContents, visible, dictionaryName]);
};
