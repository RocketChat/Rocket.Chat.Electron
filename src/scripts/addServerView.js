import { ipcRenderer } from 'electron';
import { t } from 'i18next';

import servers from './servers';
import { createElement, useRoot, useRef, useEffect, useState } from './reactiveUi';

function AddServerView({ defaultServerUrl = 'https://open.rocket.chat', visible }) {
	const root = useRoot();

	const inputRef = useRef();

	useEffect(() => {
		if (!visible) {
			return;
		}

		inputRef.current.focus();
	}, [visible]);

	const [validationState, setValidationState] = useState('idle');
	const [errorMessage, setErrorMessage] = useState(null);

	const validateServerUrl = async (serverUrl) => {
		inputRef.current.value = serverUrl;

		setValidationState('validating');
		setErrorMessage(null);

		if (!serverUrl.length) {
			setValidationState('idle');
			return;
		}

		try {
			await servers.validateHost(serverUrl, 2000);
			setValidationState('idle');
			return;
		} catch (error) {
			if (/^https?:\/\/.+/.test(serverUrl) || error === 'basic-auth') {
				setValidationState('invalid');
				switch (error) {
					case 'basic-auth':
						setErrorMessage(t('error.authNeeded', { auth: 'username:password@host' }));
						break;
					case 'invalid':
						setErrorMessage(t('error.noValidServerFound'));
						break;
					case 'timeout':
						setErrorMessage(t('error.connectTimeout'));
						break;
				}
				return;
			}

			if (!/(^https?:\/\/)|(\.)|(^([^:]+:[^@]+@)?localhost(:\d+)?$)/.test(serverUrl)) {
				return validateServerUrl(`https://${ serverUrl }.rocket.chat`);
			}

			if (!/^https?:\/\//.test(serverUrl)) {
				return validateServerUrl(`https://${ serverUrl }`);
			}
		}
	};

	useEffect(() => {
		const handleCertificateReload = (event, url) => {
			inputRef.current.value = url.replace(/\/api\/info$/, '');
			validateServerUrl(inputRef.current.value.trim());
		};

		ipcRenderer.on('certificate-reload', handleCertificateReload);

		return () => {
			ipcRenderer.removeListener('certificate-reload', handleCertificateReload);
		};
	}, [inputRef]);

	const handleFormSubmit = async (event) => {
		event.preventDefault();

		await validateServerUrl(inputRef.current.value.trim());
		let url = inputRef.current.value || defaultServerUrl;

		url = servers.addHost(url);
		if (url !== false) {
			servers.setActive(url);
		}

		inputRef.current.value = '';
	};

	const handleInputBlur = () => {
		validateServerUrl(inputRef.current.value.trim());
	};

	root.classList.toggle('hidden', !visible);

	root.querySelector('.add-server-form').onsubmit = handleFormSubmit;

	root.querySelector('.add-server-prompt').innerHTML = t('landing.inputUrl');

	inputRef.current = root.querySelector('.add-server-input');
	root.querySelector('.add-server-input').onblur = handleInputBlur;
	root.querySelector('.add-server-input').classList.toggle('wrong', validationState === 'invalid');

	root.querySelector('.add-server-error-message').innerHTML = errorMessage || '';
	root.querySelector('.add-server-error-message').classList.toggle('hidden', validationState !== 'invalid');

	root.querySelector('.add-server-offline-error').innerText = t('error.offline');

	root.querySelector('.add-server-button').innerText = (validationState === 'idle' && t('landing.connect'))
		|| (validationState === 'validating' && t('landing.validating'))
		|| (validationState === 'invalid' && t('landing.invalidUrl'));
	root.querySelector('.add-server-button').toggleAttribute('disabled', validationState !== 'idle');

	return null;
}

let addServerViewElement;

export const mountAddServerView = () => {
	addServerViewElement = createElement(AddServerView, { visible: true });

	addServerViewElement.mount(document.querySelector('.add-server-view'));
};

export const toggleAddServerViewVisible = (visible) => {
	addServerViewElement.update({ visible });
};
