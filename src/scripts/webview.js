import { EventEmitter } from 'events';

import { ipcRenderer } from 'electron';
import { t } from 'i18next';

import { createElement, useEffect, useRoot, useState } from './reactiveUi';

function LoadingErrorView({ visible, counting, reloading, onReload }) {
	const root = useRoot();

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

const loadingErrorViews = new Map();

class WebView extends EventEmitter {
	add(host) {
		let webviewObj = this.getByUrl(host.url);
		if (webviewObj) {
			return;
		}

		webviewObj = document.createElement('webview');
		webviewObj.classList.add('webview');
		webviewObj.setAttribute('server', host.url);
		webviewObj.setAttribute('preload', '../preload.js');
		webviewObj.toggleAttribute('allowpopups', true);
		webviewObj.toggleAttribute('disablewebsecurity', false);
		webviewObj.setAttribute('enableremotemodule', 'true');

		const loadingErrorViewElement = createElement(LoadingErrorView, {
			visible: false,
			onReload: () => {
				loadingErrorViewElement.update({ reloading: true });
				webviewObj.classList.remove('failed');
				webviewObj.loadURL(host.url);
			},
		});

		loadingErrorViewElement.mount(document.createElement('div'));

		loadingErrorViews.set(host.url, loadingErrorViewElement);

		webviewObj.addEventListener('focus', () => {
			this.emit('focus', webviewObj.getWebContents());
		});

		webviewObj.addEventListener('did-navigate-in-page', (event) => {
			this.emit('did-navigate-in-page', host.url, event);
		});

		let selfXssWarned = false;
		webviewObj.addEventListener('devtools-opened', () => {
			if (selfXssWarned) {
				return;
			}

			webviewObj.getWebContents().executeJavaScript(`(${ ([title, description, moreInfo]) => {
				console.warn('%c%s', 'color: red; font-size: 32px;', title);
				console.warn('%c%s', 'font-size: 20px;', description);
				console.warn('%c%s', 'font-size: 20px;', moreInfo);
			} })(${ JSON.stringify([t('selfxss.title'), t('selfxss.description'), t('selfxss.moreInfo')]) })`);

			selfXssWarned = true;
		});

		webviewObj.addEventListener('ipc-message', (event) => {
			this.emit(`ipc-message-${ event.channel }`, host.url, event.args);

			switch (event.channel) {
				case 'get-sourceId':
					ipcRenderer.send('open-screen-sharing-dialog');
					break;
			}
		});

		webviewObj.addEventListener('dom-ready', () => {
			webviewObj.classList.add('ready');
			this.emit('dom-ready', webviewObj, host.url);
		});

		webviewObj.addEventListener('did-finish-load', () => {
			const active = webviewObj.classList.contains('active');
			const failed = webviewObj.classList.contains('failed');
			webviewObj.classList.toggle('hidden', failed);
			loadingErrorViewElement.update({ visible: active && failed, counting: failed, reloading: false });
		});

		webviewObj.addEventListener('did-fail-load', (e) => {
			if (e.errorCode === -3) {
				console.log('Ignoring likely spurious did-fail-load with errorCode -3, cf https://github.com/electron/electron/issues/14004');
				return;
			}
			if (e.isMainFrame) {
				webviewObj.classList.add('failed');
			}
		});

		webviewObj.addEventListener('did-get-response-details', (e) => {
			if (e.resourceType === 'mainFrame' && e.httpResponseCode >= 500) {
				webviewObj.classList.add('failed');
			}
		});

		this.webviewParentElement.appendChild(webviewObj);
		this.webviewParentElement.appendChild(loadingErrorViewElement.root);

		webviewObj.src = host.lastPath || host.url;
	}

	remove(hostUrl) {
		const el = this.getByUrl(hostUrl);
		if (el) {
			el.remove();
			const loadingErrorViewElement = loadingErrorViews.get(hostUrl);
			loadingErrorViewElement.root.remove();
			loadingErrorViewElement.unmount();
			loadingErrorViews.delete(hostUrl);
		}
	}

	getByUrl(hostUrl) {
		return this.webviewParentElement.querySelector(`webview[server="${ hostUrl }"]`);
	}

	getActive() {
		return document.querySelector('webview.active');
	}

	isActive(hostUrl) {
		return !!this.webviewParentElement.querySelector(`webview.active[server="${ hostUrl }"]`);
	}

	deactiveAll() {
		let item;
		while (!(item = this.getActive()) === false) {
			item.classList.remove('active');
			const loadingErrorViewElement = loadingErrorViews.get(item.getAttribute('server'));
			loadingErrorViewElement.update({ visible: false });
		}
	}

	setActive(hostUrl) {
		if (this.isActive(hostUrl)) {
			return;
		}

		this.deactiveAll();
		const item = this.getByUrl(hostUrl);
		if (item) {
			item.classList.add('active');
			const loadingErrorViewElement = loadingErrorViews.get(hostUrl);
			const failed = item.classList.contains('failed');
			loadingErrorViewElement.update({ visible: failed, counting: failed });
		}
		this.focusActive();
	}

	focusActive() {
		const active = this.getActive();
		if (active) {
			active.focus();
			return true;
		}
		return false;
	}

	goBack() {
		this.getActive().goBack();
	}

	goForward() {
		this.getActive().goForward();
	}

	setSidebarPaddingEnabled(enabled) {
		if (process.platform !== 'darwin') {
			return;
		}

		Array.from(document.querySelectorAll('webview.ready'))
			.forEach((webviewObj) => webviewObj.insertCSS(`
				.sidebar {
					padding-top: ${ enabled ? '10px' : '0' };
					transition: margin .5s ease-in-out;
				}
			`));
	}
}

const instance = new WebView();

export default instance;

function WebViews() {
	const root = useRoot();

	useEffect(() => {
		instance.webviewParentElement = root;

		const handleScreenSharingSourceSelect = (e, id) => {
			const webviewObj = instance.getActive();
			webviewObj && webviewObj.executeJavaScript(`window.parent.postMessage({ sourceId: ${ JSON.stringify(id) } }, '*');`);
		};

		ipcRenderer.on('screen-sharing-source-selected', handleScreenSharingSourceSelect);

		return () => {
			ipcRenderer.removeListener('screen-sharing-source-selected', handleScreenSharingSourceSelect);
		};
	}, []);

	return null;
}

let webViewsElement;

export const mountWebViews = () => {
	webViewsElement = createElement(WebViews);

	webViewsElement.mount(document.body);
};
