import { useTranslation } from 'react-i18next';
import React, { useEffect, useState, useRef } from 'react';
import { remote } from 'electron';

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
} from '../scripts/actions';
import { subscribe } from '../scripts/effects';

const useRoot = (elementName) => {
	const ref = useRef();

	if (!ref.current) {
		ref.current = document.createElement(elementName);
		document.body.append(ref.current);
	}

	return ref.current;
};

function LoadingErrorView({
	counting,
	reloading,
	visible,
	onReload,
}) {
	const { t } = useTranslation();

	const root = useRoot('div');

	const [counter, setCounter] = useState(60);

	useEffect(() => {
		if (!counting) {
			return;
		}

		setCounter(60);

		const reloadCounterStepSize = 1;
		const timer = setInterval(() => {
			setCounter((counter) => {
				counter -= reloadCounterStepSize;

				if (counter <= 0) {
					onReload && onReload();
					return 60;
				}

				return counter;
			});
		}, reloadCounterStepSize * 1000);

		return () => {
			clearInterval(timer);
		};
	}, [counting]);

	const handleReloadButtonClick = () => {
		onReload && onReload();
	};

	root.classList.add('webview');
	root.classList.add('loading-error-view');
	root.classList.toggle('active', visible);
	while (root.firstChild) {
		root.firstChild.remove();
	}
	root.append(document.importNode(document.querySelector('.loading-error-template').content, true));

	root.querySelector('.title').innerText = t('loadingError.announcement');

	root.querySelector('.subtitle').innerText = t('loadingError.title');

	root.querySelector('.reload-button').innerText = `${ t('loadingError.reload') } (${ counter })`;
	root.querySelector('.reload-button').classList.toggle('hidden', reloading);
	root.querySelector('.reload-button').onclick = handleReloadButtonClick;

	root.querySelector('.reloading-server').classList.toggle('hidden', !reloading);

	return null;
}

function WebUiView({
	active = false,
	failed = false,
	hasSidebar = false,
	lastPath,
	url,
	dispatch,
	onLoad,
	onFail,
}) {
	const { t } = useTranslation();

	const root = useRoot('webview');

	useEffect(() => {
		root.classList.add('webview');
		root.setAttribute('preload', '../preload.js');
		root.toggleAttribute('allowpopups', true);
		root.toggleAttribute('disablewebsecurity', false);
		root.setAttribute('enableremotemodule', 'true');
	}, []);

	useEffect(() => {
		root.classList.toggle('active', active);

		if (active) {
			root.focus();
		}
	}, [active]);

	useEffect(() => {
		const handleWindowFocus = () => {
			if (!active) {
				return;
			}

			root.focus();
		};

		window.addEventListener('focus', handleWindowFocus);

		return () => {
			window.removeEventListener('focus', handleWindowFocus);
		};
	}, [active]);

	useEffect(() => {
		root.classList.toggle('hidden', failed);
		root.classList.toggle('failed', failed);
	}, [failed]);

	const prevFailedRef = useRef(failed);

	useEffect(() => {
		if (prevFailedRef.current === failed) {
			return;
		}

		if (!failed) {
			root.loadURL(url);
		}

		prevFailedRef.current === failed;
	}, [url, failed]);

	useEffect(() => {
		const handleFocus = () => {
			dispatch({ type: WEBVIEW_FOCUSED, payload: { id: root.getWebContents().id, url } });
		};

		root.addEventListener('focus', handleFocus);

		return () => {
			root.removeEventListener('focus', handleFocus);
		};
	}, [url]);

	useEffect(() => {
		const handleDidNavigateInPage = (event) => {
			dispatch({ type: WEBVIEW_DID_NAVIGATE, payload: { url, pageUrl: event.url } });
		};

		root.addEventListener('did-navigate-in-page', handleDidNavigateInPage);

		return () => {
			root.removeEventListener('did-navigate-in-page', handleDidNavigateInPage);
		};
	}, [url]);

	const [selfXssWarned, setSelfXssWarned] = useState(false);

	useEffect(() => {
		const handleDevtoolsOpened = () => {
			if (selfXssWarned) {
				return;
			}

			root.getWebContents().executeJavaScript(`(${ ([title, description, moreInfo]) => {
				console.warn('%c%s', 'color: red; font-size: 32px;', title);
				console.warn('%c%s', 'font-size: 20px;', description);
				console.warn('%c%s', 'font-size: 20px;', moreInfo);
			} })(${ JSON.stringify([t('selfxss.title'), t('selfxss.description'), t('selfxss.moreInfo')]) })`);

			setSelfXssWarned(true);
		};

		root.addEventListener('devtools-opened', handleDevtoolsOpened);

		return () => {
			root.removeEventListener('devtools-opened', handleDevtoolsOpened);
		};
	}, []);

	const [ready, setReady] = useState(false);

	useEffect(() => {
		const handleDomReady = () => {
			setReady(true);
		};

		root.addEventListener('dom-ready', handleDomReady);

		return () => {
			root.removeEventListener('dom-ready', handleDomReady);
		};
	}, []);

	useEffect(() => {
		root.classList.toggle('ready', ready);
	}, [ready]);

	useEffect(() => {
		const handleIpcMessage = (event) => {
			switch (event.channel) {
				case 'get-sourceId':
					dispatch({ type: WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED });
					break;

				case 'unread-changed':
					dispatch({ type: WEBVIEW_UNREAD_CHANGED, payload: { url, badge: event.args[0] } });
					break;

				case 'title-changed':
					dispatch({ type: WEBVIEW_TITLE_CHANGED, payload: { url, title: event.args[0] } });
					break;

				case 'focus':
					dispatch({ type: WEBVIEW_FOCUS_REQUESTED, payload: { url } });
					break;

				case 'sidebar-style':
					dispatch({ type: WEBVIEW_SIDEBAR_STYLE_CHANGED, payload: { url, style: event.args[0] } });
					break;
			}
		};

		root.addEventListener('ipc-message', handleIpcMessage);

		return () => {
			root.removeEventListener('ipc-message', handleIpcMessage);
		};
	}, []);

	useEffect(() => {
		const handleDidFinishLoad = () => {
			onLoad && onLoad();
		};

		root.addEventListener('did-finish-load', handleDidFinishLoad);

		return () => {
			root.removeEventListener('did-finish-load', handleDidFinishLoad);
		};
	}, [onLoad]);

	useEffect(() => {
		const handleDidFailLoad = (e) => {
			if (e.errorCode === -3) {
				console.warn('Ignoring likely spurious did-fail-load with errorCode -3, cf https://github.com/electron/electron/issues/14004');
				return;
			}
			if (e.isMainFrame) {
				onFail && onFail();
			}
		};

		const handleDidGetResponseDetails = (e) => {
			if (e.resourceType === 'mainFrame' && e.httpResponseCode >= 500) {
				onFail && onFail();
			}
		};

		root.addEventListener('did-fail-load', handleDidFailLoad);
		root.addEventListener('did-get-response-details', handleDidGetResponseDetails);

		return () => {
			root.removeEventListener('did-fail-load', handleDidFailLoad);
			root.removeEventListener('did-get-response-details', handleDidGetResponseDetails);
		};
	}, [onFail]);

	useEffect(() => {
		const handleActionDispatched = async ({ type, payload }) => {
			if (type === SIDE_BAR_RELOAD_SERVER_CLICKED) {
				if (url !== payload) {
					return;
				}

				root.reload();
				return;
			}

			if (type === SIDE_BAR_OPEN_DEVTOOLS_FOR_SERVER_CLICKED) {
				if (url !== payload) {
					return;
				}

				root.openDevTools();
				return;
			}

			if (type === TOUCH_BAR_FORMAT_BUTTON_TOUCHED) {
				if (!active || failed) {
					return;
				}

				root.executeJavaScript(`(() => {
					const button = document.querySelector('.rc-message-box .js-format[data-id="${ payload }"]');
					button.click();
				})()`.trim());
				return;
			}

			if (type === SCREEN_SHARING_DIALOG_SOURCE_SELECTED) {
				if (!active) {
					return;
				}

				root.executeJavaScript(`window.parent.postMessage({ sourceId: ${ JSON.stringify(payload || 'PermissionDeniedError') } }, '*');`);
				return;
			}

			if (type === MENU_BAR_RELOAD_SERVER_CLICKED) {
				if (!active) {
					return;
				}

				const { ignoringCache = false } = payload || {};

				if (ignoringCache) {
					root.reloadIgnoringCache();
					return;
				}

				root.reload();
				return;
			}

			if (type === MENU_BAR_OPEN_DEVTOOLS_FOR_SERVER_CLICKED) {
				if (!active) {
					return;
				}

				root.openDevTools();
				return;
			}

			if (type === MENU_BAR_GO_BACK_CLICKED) {
				if (!active) {
					return;
				}

				root.goBack();
				return;
			}

			if (type === MENU_BAR_GO_FORWARD_CLICKED) {
				if (!active) {
					return;
				}

				root.goForward();
				return;
			}

			if (type === MENU_BAR_CLEAR_TRUSTED_CERTIFICATES_CLICKED) {
				root.reloadIgnoringCache();
				return;
			}

			if (type === CERTIFICATE_TRUST_REQUESTED) {
				const { webContentsId, url, error, fingerprint, issuerName, willBeReplaced } = payload;

				if (webContentsId !== root.getWebContents().id) {
					return;
				}

				let detail = `URL: ${ url }\nError: ${ error }`;
				if (willBeReplaced) {
					detail = t('error.differentCertificate', { detail });
				}

				const { response } = await remote.dialog.showMessageBox(remote.getCurrentWindow(), {
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
					dispatch({ type: WEBVIEW_CERTIFICATE_TRUSTED, payload: { fingerprint } });
					return;
				}

				dispatch({ type: WEBVIEW_CERTIFICATE_DENIED, payload: { fingerprint } });
			}
		};

		return subscribe(handleActionDispatched);
	}, [url, active, failed]);

	useEffect(() => {
		if (process.platform !== 'darwin') {
			return;
		}

		if (!root.classList.contains('ready')) {
			return;
		}

		root.insertCSS(`
			.sidebar {
				padding-top: ${ !hasSidebar ? '10px' : '0' };
				transition: margin .5s ease-in-out;
			}
		`);
	}, [hasSidebar]);

	useEffect(() => {
		root.src = lastPath || url;
	}, [url]);

	return null;
}

function ServerView({
	active = false,
	hasSidebar = false,
	lastPath,
	url,
	dispatch,
}) {
	const [failed, setFailed] = useState(false);
	const [reloading, setReloading] = useState(false);

	return <>
		<WebUiView
			active={active}
			failed={failed}
			hasSidebar={hasSidebar}
			lastPath={lastPath}
			url={url}
			dispatch={dispatch}
			onLoad={() => {
				setReloading(false);
			}}
			onFail={() => {
				setFailed(true);
			}}
		/>
		<LoadingErrorView
			visible={active && failed}
			counting={active && failed}
			reloading={reloading}
			onReload={() => {
				setFailed(false);
				setReloading(true);
			}}
		/>
	</>;
}

export function ServersView({
	hasSidebar,
	servers = [],
	currentServerUrl,
	dispatch,
}) {
	return <>
		{servers.map((server) => <ServerView
			key={server.url}
			active={currentServerUrl === server.url}
			hasSidebar={hasSidebar}
			lastPath={server.lastPath}
			url={server.url}
			dispatch={dispatch}
		/>)}
	</>;
}
