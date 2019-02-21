import { ipcRenderer, shell } from 'electron';
import attachEvents from './events';
import servers from './servers';
import sidebar from './sidebar';
import webview from './webview';
import i18n from '../i18n';

export const start = async function() {
	await i18n.initialize();

	const defaultInstance = 'https://open.rocket.chat';

	// connection check
	function online() {
		document.body.classList.remove('offline');
	}

	function offline() {
		document.body.classList.add('offline');
	}

	if (!navigator.onLine) {
		offline();
	}

	window.addEventListener('online', online);
	window.addEventListener('offline', offline);
	// end connection check

	const form = document.querySelector('form');
	const hostField = form.querySelector('[name="host"]');
	const button = form.querySelector('[type="submit"]');
	const invalidUrl = form.querySelector('#invalidUrl');

	window.addEventListener('load', () => hostField.focus());

	window.addEventListener('focus', () => webview.focusActive());

	function validateHost() {
		return new Promise(function(resolve, reject) {
			const execValidation = function() {
				invalidUrl.style.display = 'none';
				hostField.classList.remove('wrong');

				const host = hostField.value.trim();
				hostField.value = host;

				if (host.length === 0) {
					button.value = i18n.__('landing.connect');
					button.disabled = false;
					resolve();
					return;
				}

				button.value = i18n.__('landing.validating');
				button.disabled = true;

				servers.validateHost(host, 2000).then(function() {
					button.value = i18n.__('landing.connect');
					button.disabled = false;
					resolve();
				}, function(status) {
					// If the url begins with HTTP, mark as invalid
					if (/^https?:\/\/.+/.test(host) || status === 'basic-auth') {
						button.value = i18n.__('landing.invalidUrl');
						invalidUrl.style.display = 'block';
						switch (status) {
							case 'basic-auth':
								invalidUrl.innerHTML = i18n.__('error.authNeeded', { auth: 'username:password@host' });
								break;
							case 'invalid':
								invalidUrl.innerHTML = i18n.__('error.noValidServerFound');
								break;
							case 'timeout':
								invalidUrl.innerHTML = i18n.__('error.connectTimeout');
								break;
						}
						hostField.classList.add('wrong');
						reject();
						return;
					}

					// // If the url begins with HTTPS, fallback to HTTP
					// if (/^https:\/\/.+/.test(host)) {
					//     hostField.value = host.replace('https://', 'http://');
					//     return execValidation();
					// }

					// If the url isn't localhost, don't have dots and don't have protocol
					// try as a .rocket.chat subdomain
					if (!/(^https?:\/\/)|(\.)|(^([^:]+:[^@]+@)?localhost(:\d+)?$)/.test(host)) {
						hostField.value = `https://${ host }.rocket.chat`;
						return execValidation();
					}

					// If the url don't start with protocol try HTTPS
					if (!/^https?:\/\//.test(host)) {
						hostField.value = `https://${ host }`;
						return execValidation();
					}
				});
			};
			execValidation();
		});
	}

	hostField.addEventListener('blur', function() {
		validateHost().then(function() {}, function() {});
	});

	ipcRenderer.on('certificate-reload', function(event, url) {
		hostField.value = url.replace(/\/api\/info$/, '');
		validateHost().then(function() {}, function() {});
	});

	const submit = function() {
		validateHost().then(function() {
			const input = form.querySelector('[name="host"]');
			let url = input.value;

			if (url.length === 0) {
				url = defaultInstance;
			}

			url = servers.addHost(url);
			if (url !== false) {
				sidebar.show();
				servers.setActive(url);
			}

			input.value = '';
		}, function() {});
	};

	hostField.addEventListener('keydown', function(ev) {
		if (ev.which === 13) {
			ev.preventDefault();
			ev.stopPropagation();
			submit();
			return false;
		}
	});

	form.addEventListener('submit', function(ev) {
		ev.preventDefault();
		ev.stopPropagation();
		submit();
		return false;
	});

	document.querySelector('.add-server').addEventListener('click', () => {
		servers.clearActive();
		webview.showLanding();
	});

	document.addEventListener('click', (event) => {
		const anchorElement = event.target.closest('a[rel="noopener noreferrer"]');
		if (anchorElement) {
			shell.openExternal(anchorElement.href);
			event.preventDefault();
		}
	});

	attachEvents();
};
