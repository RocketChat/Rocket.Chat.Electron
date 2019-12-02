import { clipboard, remote, shell } from 'electron';
import { t } from 'i18next';

import { spellchecking } from './spellchecking';

const { dialog, getCurrentWebContents, getCurrentWindow, Menu } = remote;


const createSpellCheckingMenuTemplate = async ({
	isEditable,
	selectionText,
}) => {
	if (!isEditable) {
		return [];
	}

	const corrections = spellchecking.getCorrections(selectionText);

	const handleBrowserForLanguage = async () => {
		const { filePaths } = await dialog.showOpenDialog(getCurrentWindow(), {
			title: t('dialog.loadDictionary.title'),
			defaultPath: spellchecking.dictionariesPath,
			filters: [
				{ name: t('dialog.loadDictionary.dictionaries'), extensions: ['aff', 'dic'] },
				{ name: t('dialog.loadDictionary.allFiles'), extensions: ['*'] },
			],
			properties: ['openFile', 'multiSelections'],
		});

		try {
			await spellchecking.installDictionaries(filePaths);
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
			enabled: spellchecking.dictionaries.length > 0,
			submenu: [
				...spellchecking.dictionaries.map((dictionaryName) => ({
					label: dictionaryName,
					type: 'checkbox',
					checked: spellchecking.enabledDictionaries.includes(dictionaryName),
					click: ({ checked }) => (checked
						? spellchecking.enable(dictionaryName)
						: spellchecking.disable(dictionaryName)),
				})),
				{
					type: 'separator',
				},
				{
					label: t('contextMenu.browseForLanguage'),
					click: handleBrowserForLanguage,
				},
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

const createMenuTemplate = async (params) => [
	...await createSpellCheckingMenuTemplate(params),
	...await createImageMenuTemplate(params),
	...await createLinkMenuTemplate(params),
	...await createDefaultMenuTemplate(params),
];

export default () => {
	getCurrentWebContents().on('context-menu', (event, params) => {
		event.preventDefault();
		(async () => {
			const menu = Menu.buildFromTemplate(await createMenuTemplate(params));
			menu.popup({ window: getCurrentWindow() });
		})();
	});
};
