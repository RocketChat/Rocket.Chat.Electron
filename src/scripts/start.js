import { ipcRenderer } from 'electron';
import { t } from 'i18next';
import attachEvents from './events';
import servers from './servers';
import i18n from '../i18n';


async function setupLanding() {
	function handleConnectionStatus() {
		document.body.classList[navigator.onLine ? 'remove' : 'add']('offline');
	}
	window.addEventListener('online', handleConnectionStatus);
	window.addEventListener('offline', handleConnectionStatus);
	handleConnectionStatus();

	const defaultInstance = 'https://open.rocket.chat';

	document.querySelector('#login-card .connect__prompt').innerHTML = i18n.__('landing.inputUrl');
	document.querySelector('#login-card #invalidUrl').innerHTML = i18n.__('error.noValidServerFound');
	document.querySelector('#login-card .connect__error').innerHTML = i18n.__('error.offline');
	document.querySelector('#login-card .login').innerHTML = i18n.__('landing.connect');

	const form = document.querySelector('#login-card');
	const errorPane = form.querySelector('#invalidUrl');
	const hostField = form.querySelector('[name="host"]');
	const connectButton = form.querySelector('[type="submit"]');

	function validateHost() {
		return new Promise(function(resolve, reject) {
			function execValidation() {
				errorPane.style.display = 'none';
				hostField.classList.remove('wrong');

				const host = hostField.value.trim();
				hostField.value = host;

				if (host.length === 0) {
					connectButton.value = i18n.__('landing.connect');
					connectButton.disabled = false;
					resolve();
					return;
				}

				connectButton.value = i18n.__('landing.validating');
				connectButton.disabled = true;

				servers.validateHost(host, 2000)
					.then(() => {
						connectButton.value = i18n.__('landing.connect');
						connectButton.disabled = false;
						resolve();
					})
					.catch(function(status) {
						// If the url begins with HTTP, mark as invalid
						if (/^https?:\/\/.+/.test(host) || status === 'basic-auth') {
							connectButton.value = i18n.__('landing.invalidUrl');
							errorPane.style.display = 'block';
							switch (status) {
								case 'basic-auth':
									errorPane.innerHTML = i18n.__('error.authNeeded', { auth: 'username:password@host' });
									break;
								case 'invalid':
									errorPane.innerHTML = i18n.__('error.noValidServerFound');
									break;
								case 'timeout':
									errorPane.innerHTML = i18n.__('error.connectTimeout');
									break;
							}
							hostField.classList.add('wrong');
							reject();
							return;
						}

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
			}
			execValidation();
		});
	}

	window.addEventListener('load', () => hostField.focus());

	hostField.addEventListener('blur', () => {
		validateHost().then(function() {}, function() {});
	});

	ipcRenderer.on('certificate-reload', (event, url) => {
		hostField.value = url.replace(/\/api\/info$/, '');
		validateHost().then(function() {}, function() {});
	});

	form.addEventListener('submit', (event) => {
		event.preventDefault();
		event.stopPropagation();

		validateHost().then(function() {
			const input = form.querySelector('[name="host"]');
			let url = input.value;

			if (url.length === 0) {
				url = defaultInstance;
			}

			url = servers.addHost(url);
			if (url !== false) {
				servers.setActive(url);
			}

			input.value = '';
		}, function() {});
	});
}

export async function start() {
	await i18n.initialize();
	console.warn('%c%s', 'color: red; font-size: 32px;', t('selfxss.title'));
	console.warn('%c%s', 'font-size: 20px;', t('selfxss.description'));
	console.warn('%c%s', 'font-size: 20px;', t('selfxss.moreInfo'));
	await setupLanding();
	await attachEvents();
}
