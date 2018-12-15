import { clipboard, remote, shell } from 'electron';
import i18n from '../i18n/index';
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
				dialog.showErrorBox(i18n.__('Error'), `${ i18n.__('Error copying dictionary file') }: ${ name }`);
				console.error(error);
			}
		};

		dialog.showOpenDialog(getCurrentWindow(), {
			title: i18n.__('Open_Language_Dictionary'),
			defaultPath: spellchecking.dictionariesPath,
			filters: [
				{ name: i18n.__('Dictionaries'), extensions: ['aff', 'dic'] },
				{ name: i18n.__('All files'), extensions: ['*'] },
			],
			properties: ['openFile', 'multiSelections'],
		}, callback);
	};

	return [
		...(corrections ? [
			...(corrections.length === 0 ? (
				[
					{
						label: i18n.__('No_suggestions'),
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
					label: i18n.__('More_spelling_suggestions'),
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
			label: i18n.__('Spelling_languages'),
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
					label: i18n.__('Browse_for_language'),
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
				label: i18n.__('Save image as...'),
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
				label: i18n.__('Open link'),
				click: () => shell.openExternal(linkURL),
			},
			{
				label: i18n.__('Copy link text'),
				click: () => clipboard.write({ text: linkText, bookmark: linkText }),
				enabled: !!linkText,
			},
			{
				label: i18n.__('Copy link address'),
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
		label: i18n.__('&Undo'),
		role: 'undo',
		accelerator: 'CommandOrControl+Z',
		enabled: canUndo,
	},
	{
		label: i18n.__('&Redo'),
		role: 'redo',
		accelerator: process.platform === 'win32' ? 'Control+Y' : 'CommandOrControl+Shift+Z',
		enabled: canRedo,
	},
	{
		type: 'separator',
	},
	{
		label: i18n.__('Cu&t'),
		role: 'cut',
		accelerator: 'CommandOrControl+X',
		enabled: canCut,
	},
	{
		label: i18n.__('&Copy'),
		role: 'copy',
		accelerator: 'CommandOrControl+C',
		enabled: canCopy,
	},
	{
		label: i18n.__('&Paste'),
		role: 'paste',
		accelerator: 'CommandOrControl+V',
		enabled: canPaste,
	},
	{
		label: i18n.__('Select &all'),
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
