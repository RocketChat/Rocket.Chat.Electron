import { remote, shell, clipboard } from 'electron';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import {
	useSpellCheckingDictionaries,
	useSpellCheckingDictionaryInstall,
	useCorrectionsForMisspelling,
} from '../SpellCheckingProvider';

export const useWebviewContextMenu = (webviewRef, webContents) => {
	const { t } = useTranslation();

	const { dictionaries: spellCheckingDictionaries, toggleDictionary } = useSpellCheckingDictionaries();
	const dictionaryInstall = useSpellCheckingDictionaryInstall();
	const getSuggestionsForMisspelling = useCorrectionsForMisspelling();

	useEffect(() => {
		if (!webContents) {
			return;
		}

		const root = webviewRef.current;

		const createSpellCheckingMenuTemplate = (root, t, {
			isEditable,
			corrections,
			dictionaries,
			dictionaryInstall: {
				directory: dictionariesDirectoryPath,
				extension: dictionaryExtension,
				install: installDictionary,
			},
			enableSpellCheckingDictionary,
			disableSpellCheckingDictionary,
		}) => {
			if (!isEditable) {
				return [];
			}

			const handleBrowserForLanguage = async () => {
				const { filePaths } = await remote.dialog.showOpenDialog(remote.getCurrentWindow(), {
					title: t('dialog.loadDictionary.title'),
					defaultPath: dictionariesDirectoryPath,
					filters: [
						{ name: t('dialog.loadDictionary.dictionaries'), extensions: [dictionaryExtension] },
						{ name: t('dialog.loadDictionary.allFiles'), extensions: ['*'] },
					],
					properties: ['openFile', 'multiSelections'],
				});

				try {
					await Promise.all(filePaths.map(installDictionary));
				} catch (error) {
					console.error(error);
					remote.dialog.showErrorBox(
						t('dialog.loadDictionaryError.title'),
						t('dialog.loadDictionaryError.message', { message: error.message }),
					);
				}
			};

			return [
				...corrections ? [
					...corrections.length === 0
						? [
							{
								label: t('contextMenu.noSpellingSuggestions'),
								enabled: false,
							},
						]
						: corrections.slice(0, 6).map((correction) => ({
							label: correction,
							click: () => root.getWebContents().replaceMisspelling(correction),
						})),
					...corrections.length > 6 ? [
						{
							label: t('contextMenu.moreSpellingSuggestions'),
							submenu: corrections.slice(6).map((correction) => ({
								label: correction,
								click: () => root.getWebContents().replaceMisspelling(correction),
							})),
						},
					] : [],
					{
						type: 'separator',
					},
				] : [],
				{
					label: t('contextMenu.spellingLanguages'),
					enabled: dictionaries.length > 0,
					submenu: [
						...dictionaries.map(({ name, enabled }) => ({
							label: name,
							type: 'checkbox',
							checked: enabled,
							click: ({ checked }) => (checked
								? enableSpellCheckingDictionary(name)
								: disableSpellCheckingDictionary(name)),
						})),
						...process.platform !== 'darwin' ? [
							{
								type: 'separator',
							},
							{
								label: t('contextMenu.browseForLanguage'),
								click: handleBrowserForLanguage,
							},
						] : [],
					],
				},
				{
					type: 'separator',
				},
			];
		};

		const createImageMenuTemplate = (root, t, {
			mediaType,
			srcURL,
		}) => (
			mediaType === 'image'
				? [
					{
						label: t('contextMenu.saveImageAs'),
						click: () => root.getWebContents().downloadURL(srcURL),
					},
					{
						type: 'separator',
					},
				]
				: []
		);

		const createLinkMenuTemplate = (root, t, {
			linkURL,
			linkText,
		}) => (
			linkURL
				? [
					{
						label: t('contextMenu.openLink'),
						click: () => shell.openExternal(linkURL),
					},
					{
						label: t('contextMenu.copyLinkText'),
						click: () => clipboard.write({ text: linkText, bookmark: linkText }),
						enabled: !!linkText,
					},
					{
						label: t('contextMenu.copyLinkAddress'),
						click: () => clipboard.write({ text: linkURL, bookmark: linkText }),
					},
					{
						type: 'separator',
					},
				]
				: []
		);

		const createDefaultMenuTemplate = (root, t, {
			editFlags: {
				canUndo = false,
				canRedo = false,
				canCut = false,
				canCopy = false,
				canPaste = false,
				canSelectAll = false,
			} = {},
		} = {}) => [
			{
				label: t('contextMenu.undo'),
				role: 'undo',
				accelerator: 'CommandOrControl+Z',
				enabled: canUndo,
			},
			{
				label: t('contextMenu.redo'),
				role: 'redo',
				accelerator: process.platform === 'win32' ? 'Control+Y' : 'CommandOrControl+Shift+Z',
				enabled: canRedo,
			},
			{
				type: 'separator',
			},
			{
				label: t('contextMenu.cut'),
				role: 'cut',
				accelerator: 'CommandOrControl+X',
				enabled: canCut,
			},
			{
				label: t('contextMenu.copy'),
				role: 'copy',
				accelerator: 'CommandOrControl+C',
				enabled: canCopy,
			},
			{
				label: t('contextMenu.paste'),
				role: 'paste',
				accelerator: 'CommandOrControl+V',
				enabled: canPaste,
			},
			{
				label: t('contextMenu.selectAll'),
				role: 'selectall',
				accelerator: 'CommandOrControl+A',
				enabled: canSelectAll,
			},
		];


		const computeProps = async (params) => {
			const { selectionText } = params;
			return {
				...params,
				corrections: await getSuggestionsForMisspelling(selectionText),
				dictionaries: spellCheckingDictionaries,
				dictionaryInstall,
				enableSpellCheckingDictionary: (...args) => args.forEach((arg) => toggleDictionary(arg, true)),
				disableSpellCheckingDictionary: (...args) => args.forEach((arg) => toggleDictionary(arg, false)),
			};
		};

		const handleContextMenu = async (event) => {
			const props = await computeProps(event.params);

			const template = [
				...createSpellCheckingMenuTemplate(root, t, props),
				...createImageMenuTemplate(root, t, props),
				...createLinkMenuTemplate(root, t, props),
				...createDefaultMenuTemplate(root, t, props),
			];

			const menu = remote.Menu.buildFromTemplate(template);
			menu.popup({ window: remote.getCurrentWindow() });
		};

		root.addEventListener('context-menu', handleContextMenu);

		return () => {
			root.removeEventListener('context-menu', handleContextMenu);
		};
	}, [spellCheckingDictionaries, getSuggestionsForMisspelling, webviewRef, dictionaryInstall, toggleDictionary, t, webContents]);
};
