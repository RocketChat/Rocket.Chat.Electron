import { clipboard, remote, shell } from 'electron';
import i18n from '../i18n';
import { spellchecking } from './spellchecking';
const { dialog, getCurrentWebContents, getCurrentWindow, Menu } = remote;


const createSpellCheckingMenuTemplate = async({
	isEditable,
	selectionText,
}) => {
	if (!isEditable) {
		return [];
	}

	const corrections = spellchecking.getCorrections(selectionText);

	const handleBrowserForLanguage = () => {
		const callback = async(filePaths) => {
			try {
				await spellchecking.installDictionaries(filePaths);
			} catch (error) {
				console.error(error);
				dialog.showErrorBox(
					i18n.__('dialog.loadDictionaryError.title'),
					i18n.__('dialog.loadDictionaryError.message', { message: error.message })
				);
			}
		};

		dialog.showOpenDialog(getCurrentWindow(), {
			title: i18n.__('dialog.loadDictionary.title'),
			defaultPath: spellchecking.dictionariesPath,
			filters: [
				{ name: i18n.__('dialog.loadDictionary.dictionaries'), extensions: ['aff', 'dic'] },
				{ name: i18n.__('dialog.loadDictionary.allFiles'), extensions: ['*'] },
			],
			properties: ['openFile', 'multiSelections'],
		}, callback);
	};

	return [
		...(corrections ? [
			...(corrections.length === 0 ? (
				[
					{
						label: i18n.__('contextMenu.noSpellingSuggestions'),
						enabled: false,
					},
				]
			) : (
				corrections.slice(0, 6).map((correction) => ({
					label: correction,
					click: () => getCurrentWebContents().replaceMisspelling(correction),
				}))
			)),
			...(corrections.length > 6 ? [
				{
					label: i18n.__('contextMenu.moreSpellingSuggestions'),
					submenu: corrections.slice(6).map((correction) => ({
						label: correction,
						click: () => getCurrentWebContents().replaceMisspelling(correction),
					})),
				},
			] : []),
			{
				type: 'separator',
			},
		] : []),
		{
			label: i18n.__('contextMenu.spellingLanguages'),
			enabled: spellchecking.dictionaries.length > 0,
			submenu: [
				...spellchecking.dictionaries.map((dictionaryName) => ({
					label: dictionaryName,
					type: 'checkbox',
					checked: spellchecking.enabledDictionaries.includes(dictionaryName),
					click: ({ checked }) => (checked ?
						spellchecking.enable(dictionaryName) :
						spellchecking.disable(dictionaryName)),
				})),
				{
					type: 'separator',
				},
				{
					label: i18n.__('contextMenu.browseForLanguage'),
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
	mediaType === 'image' ?
		[
			{
				label: i18n.__('contextMenu.saveImageAs'),
				click: () => getCurrentWebContents().downloadURL(srcURL),
			},
			{
				type: 'separator',
			},
		] :
		[]
);

const createLinkMenuTemplate = ({
	linkURL,
	linkText,
}) => (
	linkURL ?
		[
			{
				label: i18n.__('contextMenu.openLink'),
				click: () => shell.openExternal(linkURL),
			},
			{
				label: i18n.__('contextMenu.copyLinkText'),
				click: () => clipboard.write({ text: linkText, bookmark: linkText }),
				enabled: !!linkText,
			},
			{
				label: i18n.__('contextMenu.copyLinkAddress'),
				click: () => clipboard.write({ text: linkURL, bookmark: linkText }),
			},
			{
				type: 'separator',
			},
		] :
		[]
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
		label: i18n.__('contextMenu.undo'),
		role: 'undo',
		accelerator: 'CommandOrControl+Z',
		enabled: canUndo,
	},
	{
		label: i18n.__('contextMenu.redo'),
		role: 'redo',
		accelerator: process.platform === 'win32' ? 'Control+Y' : 'CommandOrControl+Shift+Z',
		enabled: canRedo,
	},
	{
		type: 'separator',
	},
	{
		label: i18n.__('contextMenu.cut'),
		role: 'cut',
		accelerator: 'CommandOrControl+X',
		enabled: canCut,
	},
	{
		label: i18n.__('contextMenu.copy'),
		role: 'copy',
		accelerator: 'CommandOrControl+C',
		enabled: canCopy,
	},
	{
		label: i18n.__('contextMenu.paste'),
		role: 'paste',
		accelerator: 'CommandOrControl+V',
		enabled: canPaste,
	},
	{
		label: i18n.__('contextMenu.selectAll'),
		role: 'selectall',
		accelerator: 'CommandOrControl+A',
		enabled: canSelectAll,
	},
];

const createMenuTemplate = async(params) => [
	...(await createSpellCheckingMenuTemplate(params)),
	...(await createImageMenuTemplate(params)),
	...(await createLinkMenuTemplate(params)),
	...(await createDefaultMenuTemplate(params)),
];

export default () => {
	getCurrentWebContents().on('context-menu', (event, params) => {
		event.preventDefault();
		(async() => {
			const menu = Menu.buildFromTemplate(await createMenuTemplate(params));
			menu.popup({ window: getCurrentWindow() });
		})();
	});
};
