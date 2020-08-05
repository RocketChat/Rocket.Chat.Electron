import { clipboard, shell, Menu, ipcMain } from 'electron';
import { t } from 'i18next';

import { WEBVIEW_SPELL_CHECKING_DICTIONARY_TOGGLED } from '../../../actions';
import { selectSpellCheckingDictionaries, selectFocusedWebContents } from '../../selectors';
import { getCorrectionsForMisspelling, importSpellCheckingDictionaries } from '../../spellChecking';
import { browseForSpellCheckingDictionary } from '../dialogs';
import { EVENT_BROWSER_VIEW_CONTEXT_MENU_TRIGGERED } from '../../../ipc';

export const setupBrowserViewsContextMenu = (reduxStore, rootWindow) => {
	ipcMain.addListener(EVENT_BROWSER_VIEW_CONTEXT_MENU_TRIGGERED, async (event, params) => {
		const dictionaries = selectSpellCheckingDictionaries(reduxStore.getState());
		const webContents = selectFocusedWebContents(reduxStore.getState());

		const createSpellCheckingMenuTemplate = ({
			isEditable,
			corrections,
			dictionaries,
		}) => {
			if (!isEditable) {
				return [];
			}

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
							click: () => {
								webContents.replaceMisspelling(correction);
							},
						})),
					...corrections.length > 6 ? [
						{
							label: t('contextMenu.moreSpellingSuggestions'),
							submenu: corrections.slice(6).map((correction) => ({
								label: correction,
								click: () => {
									webContents.replaceMisspelling(correction);
								},
							})),
						},
					] : [],
					{ type: 'separator' },
				] : [],
				{
					label: t('contextMenu.spellingLanguages'),
					enabled: dictionaries.length > 0,
					submenu: [
						...dictionaries.map(({ name, enabled }) => ({
							label: name,
							type: 'checkbox',
							checked: enabled,
							click: ({ checked }) => {
								reduxStore.dispatch({
									type: WEBVIEW_SPELL_CHECKING_DICTIONARY_TOGGLED,
									payload: { name, enabled: checked },
								});
							},
						})),
						{ type: 'separator' },
						{
							label: t('contextMenu.browseForLanguage'),
							click: async () => {
								const filePaths = await browseForSpellCheckingDictionary(rootWindow);
								importSpellCheckingDictionaries(reduxStore, filePaths);
							},
						},
					],
				},
				{ type: 'separator' },
			];
		};

		const createImageMenuTemplate = ({
			mediaType,
			srcURL,
		}) => (
			mediaType === 'image' ? [
				{
					label: t('contextMenu.saveImageAs'),
					click: () => webContents.downloadURL(srcURL),
				},
				{ type: 'separator' },
			] : []
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
					{ type: 'separator' },
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
			{ type: 'separator' },
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

		const props = {
			...params,
			corrections: await getCorrectionsForMisspelling(params.selectionText),
			dictionaries,
		};

		const template = [
			...createSpellCheckingMenuTemplate(props),
			...createImageMenuTemplate(props),
			...createLinkMenuTemplate(props),
			...createDefaultMenuTemplate(props),
		];

		const menu = Menu.buildFromTemplate(template);
		menu.popup({ window: rootWindow });
	});
};
