import { clipboard, remote, shell } from 'electron';
import { t } from 'i18next';

import { invoke } from '../scripts/ipc';

const { dialog, getCurrentWebContents, getCurrentWindow, Menu } = remote;


const createSpellCheckingMenuTemplate = ({
	isEditable,
	corrections,
	dictionaries,
	dictionariesPath,
	enabledDictionaries,
	installDictionaries,
	enableSpellCheckingDictionary,
	disableSpellCheckingDictionary,
}) => {
	if (!isEditable) {
		return [];
	}

	const handleBrowserForLanguage = async () => {
		const { filePaths } = await dialog.showOpenDialog(getCurrentWindow(), {
			title: t('dialog.loadDictionary.title'),
			defaultPath: dictionariesPath,
			filters: [
				{ name: t('dialog.loadDictionary.dictionaries'), extensions: ['dic', 'aff'] },
				{ name: t('dialog.loadDictionary.allFiles'), extensions: ['*'] },
			],
			properties: ['openFile', 'multiSelections'],
		});

		try {
			await installDictionaries(filePaths);
		} catch (error) {
			console.error(error);
			dialog.showErrorBox(
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
					click: () => getCurrentWebContents().replaceMisspelling(correction),
				})),
			...corrections.length > 6 ? [
				{
					label: t('contextMenu.moreSpellingSuggestions'),
					submenu: corrections.slice(6).map((correction) => ({
						label: correction,
						click: () => getCurrentWebContents().replaceMisspelling(correction),
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
				...dictionaries.map((dictionaryName) => ({
					label: dictionaryName,
					type: 'checkbox',
					checked: enabledDictionaries.includes(dictionaryName),
					click: ({ checked }) => (checked
						? enableSpellCheckingDictionary(dictionaryName)
						: disableSpellCheckingDictionary(dictionaryName)),
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

const createImageMenuTemplate = ({
	mediaType,
	srcURL,
}) => (
	mediaType === 'image'
		? [
			{
				label: t('contextMenu.saveImageAs'),
				click: () => getCurrentWebContents().downloadURL(srcURL),
			},
			{
				type: 'separator',
			},
		]
		: []
);

const createLinkMenuTemplate = ({
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

const createDefaultMenuTemplate = ({
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
		corrections: await invoke('spell-checking/get-corrections', selectionText),
		dictionaries: await invoke('spell-checking/get-dictionaries'),
		dictionariesPath: await invoke('spell-checking/get-dictionaries-path'),
		enabledDictionaries: await invoke('spell-checking/get-enabled-dictionaries'),
		installDictionaries: (...args) => invoke('spell-checking/install-dictionaries', ...args),
		enableSpellCheckingDictionary: (...args) => invoke('spell-checking/enable-dictionaries', ...args),
		disableSpellCheckingDictionary: (...args) => invoke('spell-checking/disable-dictionaries', ...args),
	};
};

const handleContextMenu = async (event, params) => {
	event.preventDefault();

	const props = await computeProps(params);

	const template = [
		...createSpellCheckingMenuTemplate(props),
		...createImageMenuTemplate(props),
		...createLinkMenuTemplate(props),
		...createDefaultMenuTemplate(props),
	];

	const menu = Menu.buildFromTemplate(template);
	menu.popup({ window: getCurrentWindow() });
};

export default () => {
	getCurrentWebContents().on('context-menu', handleContextMenu);
};
