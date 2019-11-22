import { EventEmitter } from 'events';

import { ipcRenderer } from 'electron';
import { t } from 'i18next';

import servers from './servers';


class WebView extends EventEmitter {
	initialize = () => {
		this.webviewParentElement = document.body;

		servers.forEach(::this.add);

		ipcRenderer.on('screenshare-result', (e, id) => {
			const webviewObj = this.getActive();
			webviewObj.executeJavaScript(`
				window.parent.postMessage({ sourceId: '${ id }' }, '*');
			`);
		});
	}

	loaded() {
		document.querySelector('.app-page').classList.remove('app-page--loading');
	}

	loading() {
		document.querySelector('.app-page').classList.add('app-page--loading');
	}

	add(host) {
		let webviewObj = this.getByUrl(host.url);
		if (webviewObj) {
			return;
		}

		webviewObj = document.createElement('webview');
		webviewObj.classList.add('webview');
		webviewObj.setAttribute('server', host.url);
		webviewObj.setAttribute('preload', '../preload.js');
		webviewObj.setAttribute('allowpopups', 'on');
		webviewObj.setAttribute('disablewebsecurity', 'on');

		const loadingErrorView = document.createElement('webview');
		loadingErrorView.classList.add('webview');
		loadingErrorView.setAttribute('preload', '../preload.js');
		loadingErrorView.setAttribute('allowpopups', 'on');
		loadingErrorView.setAttribute('disablewebsecurity', 'on');

		webviewObj.addEventListener('did-navigate-in-page', (lastPath) => {
			if (lastPath.url.includes(host.url)) {
				this.saveLastPath(host.url, lastPath.url);
			}
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
				case 'reload-server': {
					this.loading();
					webviewObj.loadURL(host.url);
					break;
				}
			}
		});

		loadingErrorView.addEventListener('ipc-message', ({ channel }) => {
			if (channel === 'reload-server') {
				this.loading();
				webviewObj.loadURL(host.url);
				loadingErrorView.reload();
			}
		});

		webviewObj.addEventListener('dom-ready', () => {
			webviewObj.classList.add('ready');
			this.emit('dom-ready', webviewObj, host.url);
		});

		loadingErrorView.addEventListener('dom-ready', () => {
			loadingErrorView.classList.add('ready');
		});

		webviewObj.addEventListener('did-finish-load', () => {
			const failed = webviewObj.classList.contains('failed');
			webviewObj.classList.toggle('hidden', failed);
			loadingErrorView.classList.toggle('hidden', !failed);

			loadingErrorView.src = failed ? `file://${ __dirname }/loadingError.html` : 'about:blank';
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
		this.webviewParentElement.appendChild(loadingErrorView);

		webviewObj.src = host.lastPath || host.url;
	}

	remove(hostUrl) {
		const el = this.getByUrl(hostUrl);
		if (el) {
			el.remove();
		}
	}

	saveLastPath(hostUrl, lastPathUrl) {
		const { hosts } = servers;
		hosts[hostUrl].lastPath = lastPathUrl;
		servers.hosts = hosts;
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
		}
		document.querySelector('.landing-page').classList.add('hide');
	}

	showLanding() {
		this.loaded();
		document.querySelector('.landing-page').classList.remove('hide');
	}

	setActive(hostUrl) {
		if (this.isActive(hostUrl)) {
			return;
		}

		this.deactiveAll();
		const item = this.getByUrl(hostUrl);
		if (item) {
			item.classList.add('active');
			item.nextElementSibling.classList.add('active');
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
			.filter((webviewObj) => webviewObj.insertCSS)
			.forEach((webviewObj) => webviewObj.insertCSS(`
				.sidebar {
					padding-top: ${ enabled ? '10px' : '0' };
					transition: margin .5s ease-in-out;
				}
			`));
	}
}

export default new WebView();
