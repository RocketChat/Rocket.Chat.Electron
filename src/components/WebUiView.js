import { remote, shell, clipboard } from 'electron';
import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { call, put, takeEvery } from 'redux-saga/effects';

import {
	WEBVIEW_UNREAD_CHANGED,
	WEBVIEW_TITLE_CHANGED,
	WEBVIEW_FOCUS_REQUESTED,
	WEBVIEW_SIDEBAR_STYLE_CHANGED,
	WEBVIEW_DID_NAVIGATE,
	WEBVIEW_FOCUSED,
	WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED,
	SIDE_BAR_RELOAD_SERVER_CLICKED,
	SIDE_BAR_OPEN_DEVTOOLS_FOR_SERVER_CLICKED,
	TOUCH_BAR_FORMAT_BUTTON_TOUCHED,
	SCREEN_SHARING_DIALOG_SOURCE_SELECTED,
	MENU_BAR_RELOAD_SERVER_CLICKED,
	MENU_BAR_OPEN_DEVTOOLS_FOR_SERVER_CLICKED,
	MENU_BAR_GO_BACK_CLICKED,
	MENU_BAR_GO_FORWARD_CLICKED,
	MENU_BAR_CLEAR_TRUSTED_CERTIFICATES_CLICKED,
	CERTIFICATE_TRUST_REQUESTED,
	WEBVIEW_CERTIFICATE_TRUSTED,
	WEBVIEW_CERTIFICATE_DENIED,
	WEBVIEW_FAVICON_CHANGED,
	WEBVIEW_LOADING_DONE,
	WEBVIEW_LOADING_STARTED,
	WEBVIEW_LOADING_FAILED,
	LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED,
	WEBVIEW_SHORTCUT_KEY_UP,
	WEBVIEW_SHORTCUT_KEY_DOWN,
} from '../actions';
import { useSaga } from './SagaMiddlewareProvider';
import {
	useCorrectionsForMisspelling,
	useMisspellingDectection,
	useSpellCheckingDictionaries,
	useSpellCheckingDictionaryInstall,
} from './SpellCheckingProvider';
import { useCertificateErrorHandler } from './CertificatesProvider';

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

const useWebview = () => {
	const webviewRef = useRef();
	const [webContents, setWebContents] = useState(null);

	useEffect(() => {
		const webview = webviewRef.current;

		webview.addEventListener('did-attach', console.log);
		webview.addEventListener('destroyed', console.log);

		const handleDidAttach = () => {
			setWebContents(webview.getWebContents());
		};

		const handleDestroyed = () => {
			setWebContents(null);
		};

		webview.addEventListener('did-attach', handleDidAttach);
		webview.addEventListener('destroyed', handleDestroyed);

		return () => {
			webview.removeEventListener('did-attach', handleDidAttach);
			webview.removeEventListener('destroyed', handleDestroyed);
		};
	}, [webviewRef]);

	return [webviewRef, webContents];
};

const useWebviewFocus = (webviewRef, webContents, { url, active }) => {
	const dispatch = useDispatch();

	useEffect(() => {
		if (!webContents || !active) {
			return;
		}

		const webview = webviewRef.current;

		const handle = () => {
			webview.focus();
		};

		handle();

		window.addEventListener('focus', handle);
		webContents.addListener('dom-ready', handle);

		return () => {
			window.removeEventListener('focus', handle);
			webContents.removeListener('dom-ready', handle);
		};
	}, [webviewRef, webContents, active]);

	useEffect(() => {
		if (!webContents) {
			return;
		}

		const webview = webviewRef.current;

		const handleFocus = () => {
			dispatch({ type: WEBVIEW_FOCUSED, payload: { webContentsId: webContents.id, url } });
		};

		webview.addEventListener('focus', handleFocus);

		return () => {
			webview.removeEventListener('focus', handleFocus);
		};
	}, [webviewRef, webContents, dispatch, url]);
};

export function WebUiView({
	active = false,
	failed = false,
	hasSidebar = false,
	lastPath,
	url,
}) {
	const dispatch = useDispatch();

	const { t } = useTranslation();

	const [webviewRef, webContents] = useWebview();
	useWebviewFocus(webviewRef, webContents, { url, active });

	const { dictionaries: spellCheckingDictionaries, toggleDictionary } = useSpellCheckingDictionaries();
	const dictionaryInstall = useSpellCheckingDictionaryInstall();
	const getSuggestionsForMisspelling = useCorrectionsForMisspelling();
	useEffect(() => {
		const root = webviewRef.current;

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
	}, [spellCheckingDictionaries, getSuggestionsForMisspelling, webviewRef, dictionaryInstall, toggleDictionary, t]);

	useEffect(() => {
		const root = webviewRef.current;

		const handleDidNavigateInPage = (event) => {
			dispatch({ type: WEBVIEW_DID_NAVIGATE, payload: { url, pageUrl: event.url } });
		};

		root.addEventListener('did-navigate-in-page', handleDidNavigateInPage);

		return () => {
			root.removeEventListener('did-navigate-in-page', handleDidNavigateInPage);
		};
	}, [dispatch, url, webviewRef]);

	const handleCertificateError = useCertificateErrorHandler();

	useEffect(() => {
		const root = webviewRef.current;
		const context = { webContentsId: root.getWebContents().id, url };
		const handleCertificateErrorForWebView = (event, ...args) => {
			handleCertificateError(context, ...args);
		};

		root.getWebContents().addListener('certificate-error', handleCertificateErrorForWebView);

		return () => {
			root.getWebContents().removeListener('certificate-error', handleCertificateErrorForWebView);
		};
	}, [url, handleCertificateError, webviewRef]);

	const getMisspelledWords = useMisspellingDectection();

	useEffect(() => {
		const root = webviewRef.current;
		const webContentsId = root.getWebContents().id;

		const handleIpcMessage = (event) => {
			switch (event.channel) {
				case 'get-sourceId':
					dispatch({ type: WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED, payload: { webContentsId, url } });
					break;

				case 'unread-changed':
					dispatch({ type: WEBVIEW_UNREAD_CHANGED, payload: { webContentsId, url, badge: event.args[0] } });
					break;

				case 'title-changed':
					dispatch({ type: WEBVIEW_TITLE_CHANGED, payload: { webContentsId, url, title: event.args[0] } });
					break;

				case 'focus':
					dispatch({ type: WEBVIEW_FOCUS_REQUESTED, payload: { webContentsId, url } });
					break;

				case 'sidebar-style':
					dispatch({ type: WEBVIEW_SIDEBAR_STYLE_CHANGED, payload: { webContentsId, url, style: event.args[0] } });
					break;

				case 'get-misspelled-words':
					root.send('misspelled-words', JSON.stringify(event.args[0]), getMisspelledWords(event.args[0]));
					break;

				case 'favicon-changed':
					dispatch({ type: WEBVIEW_FAVICON_CHANGED, payload: { webContentsId, url, favicon: event.args[0] } });
					break;
			}
		};

		root.addEventListener('ipc-message', handleIpcMessage);

		return () => {
			root.removeEventListener('ipc-message', handleIpcMessage);
		};
	}, [dispatch, getMisspelledWords, url, webviewRef]);

	useEffect(() => {
		const root = webviewRef.current;

		const handleDidFinishLoad = () => {
			dispatch({ type: WEBVIEW_LOADING_DONE, payload: { webContentsId: root.getWebContents().id, url } });
		};

		root.getWebContents().addListener('did-finish-load', handleDidFinishLoad);

		return () => {
			root.getWebContents().removeListener('did-finish-load', handleDidFinishLoad);
		};
	}, [dispatch, url, webviewRef]);

	useEffect(() => {
		const root = webviewRef.current;

		const handleDidFailLoad = (event) => {
			if (event.errorCode === -3) {
				console.warn('Ignoring likely spurious did-fail-load with errorCode -3, cf https://github.com/electron/electron/issues/14004');
				return;
			}
			if (event.isMainFrame) {
				dispatch({ type: WEBVIEW_LOADING_FAILED, payload: { webContentsId: root.getWebContents().id, url } });
			}
		};

		const handleDidGetResponseDetails = (event) => {
			if (event.resourceType === 'mainFrame' && event.httpResponseCode >= 500) {
				dispatch({ type: WEBVIEW_LOADING_FAILED, payload: { webContentsId: root.getWebContents().id, url } });
			}
		};

		root.getWebContents().addListener('did-fail-load', handleDidFailLoad);
		root.getWebContents().addListener('did-get-response-details', handleDidGetResponseDetails);

		return () => {
			root.getWebContents().removeListener('did-fail-load', handleDidFailLoad);
			root.getWebContents().removeListener('did-get-response-details', handleDidGetResponseDetails);
		};
	}, [dispatch, url, webviewRef]);

	useEffect(() => {
		const root = webviewRef.current;

		const handleDidStartLoading = () => {
			dispatch({ type: WEBVIEW_LOADING_STARTED, payload: { webContentsId: root.getWebContents().id, url } });
		};

		root.addEventListener('did-start-loading', handleDidStartLoading);

		return () => {
			root.removeEventListener('did-start-loading', handleDidStartLoading);
		};
	}, [dispatch, url, webviewRef]);

	useEffect(() => {
		const root = webviewRef.current;

		const shortcutKey = process.platform === 'darwin' ? 'Meta' : 'Control';
		const handle = (_, { type, key }) => {
			if (key !== shortcutKey) {
				return;
			}

			dispatch({
				type: type === 'keyUp' ? WEBVIEW_SHORTCUT_KEY_UP : WEBVIEW_SHORTCUT_KEY_DOWN,
				payload: { webContentsId: root.getWebContents().id, url },
			});
		};

		root.getWebContents().addListener('before-input-event', handle);

		return () => {
			root.getWebContents().removeListener('before-input-event', handle);
		};
	}, [dispatch, url, webviewRef]);

	useSaga(function *() {
		yield takeEvery([
			SIDE_BAR_RELOAD_SERVER_CLICKED,
			LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED,
		], function *({ payload }) {
			if (url !== payload) {
				return;
			}

			const root = webviewRef.current;
			root.loadURL(url);
		});

		yield takeEvery(SIDE_BAR_OPEN_DEVTOOLS_FOR_SERVER_CLICKED, function *({ payload }) {
			if (url !== payload) {
				return;
			}

			const root = webviewRef.current;
			root.openDevTools();
		});

		yield takeEvery(TOUCH_BAR_FORMAT_BUTTON_TOUCHED, function *({ payload }) {
			if (!active || failed) {
				return;
			}

			const root = webviewRef.current;
			root.send('format-button-touched', payload);
		});

		yield takeEvery(SCREEN_SHARING_DIALOG_SOURCE_SELECTED, function *({ payload }) {
			if (!active) {
				return;
			}

			const root = webviewRef.current;
			root.send('screen-sharing-source-selected', payload);
		});

		yield takeEvery(MENU_BAR_RELOAD_SERVER_CLICKED, function *({ payload: { ignoringCache = false } = {} }) {
			if (!active) {
				return;
			}

			const root = webviewRef.current;

			if (ignoringCache) {
				root.reloadIgnoringCache();
				return;
			}

			root.reload();
		});

		yield takeEvery(MENU_BAR_OPEN_DEVTOOLS_FOR_SERVER_CLICKED, function *() {
			if (!active) {
				return;
			}

			const root = webviewRef.current;
			root.openDevTools();
		});

		yield takeEvery(MENU_BAR_GO_BACK_CLICKED, function *() {
			if (!active) {
				return;
			}
			const root = webviewRef.current;
			root.goBack();
		});

		yield takeEvery(MENU_BAR_GO_FORWARD_CLICKED, function *() {
			if (!active) {
				return;
			}
			const root = webviewRef.current;
			root.goForward();
		});

		yield takeEvery(MENU_BAR_CLEAR_TRUSTED_CERTIFICATES_CLICKED, function *() {
			const root = webviewRef.current;
			root.reloadIgnoringCache();
		});

		yield takeEvery(CERTIFICATE_TRUST_REQUESTED, function *({ payload }) {
			const { webContentsId, requestedUrl, error, fingerprint, issuerName, willBeReplaced } = payload;

			const root = webviewRef.current;

			if (webContentsId !== root.getWebContents().id) {
				return;
			}

			let detail = `URL: ${ requestedUrl }\nError: ${ error }`;
			if (willBeReplaced) {
				detail = t('error.differentCertificate', { detail });
			}

			const { response } = yield call(remote.dialog.showMessageBox, remote.getCurrentWindow(), {
				title: t('dialog.certificateError.title'),
				message: t('dialog.certificateError.message', { issuerName }),
				detail,
				type: 'warning',
				buttons: [
					t('dialog.certificateError.yes'),
					t('dialog.certificateError.no'),
				],
				cancelId: 1,
			});

			if (response === 0) {
				yield put({ type: WEBVIEW_CERTIFICATE_TRUSTED, payload: { webContentsId: root.getWebContents().id, url, fingerprint } });
				return;
			}

			yield put({ type: WEBVIEW_CERTIFICATE_DENIED, payload: { webContentsId: root.getWebContents().id, url, fingerprint } });
		});
	}, [url, active, failed]);

	useEffect(() => {
		if (process.platform !== 'darwin') {
			return;
		}

		const root = webviewRef.current;

		if (!webContents) {
			return;
		}

		root.send('sidebar-visibility-changed', hasSidebar);
	}, [hasSidebar, webContents, webviewRef]);

	useEffect(() => {
		const root = webviewRef.current;
		root.src = lastPath || url;
	}, [lastPath, url, webviewRef]);

	return <webview
		allowpopups='allowpopups'
		className={[
			'webview',
			active && 'active',
			failed && 'hidden',
			failed && 'failed',
			!!webContents && 'ready',
		].filter(Boolean).join(' ')}
		disablewebsecurity='disablewebsecurity'
		enableremotemodule='true'
		preload='../preload.js'
		ref={webviewRef}
	/>;
}
