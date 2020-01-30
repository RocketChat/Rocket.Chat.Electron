import { t } from 'i18next';
import { useEffect, useRef, useState } from 'react';

import servers from './servers';
import { ADD_SERVER_VIEW_SERVER_ADDED, CERTIFICATES_CHANGED } from './actions';
import { subscribe } from './effects';

export function AddServerView({
	defaultServerUrl = 'https://open.rocket.chat',
	root = document.querySelector('.add-server-view'),
	visible,
	validator = (url) => servers.validateHost(url, 2000),
	dispatch,
}) {
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
			await validator(serverUrl);
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
		const handleActionDispatched = ({ type }) => {
			if (type === CERTIFICATES_CHANGED) {
				validateServerUrl(inputRef.current.value.trim());
			}
		};

		return subscribe(handleActionDispatched);
	}, [inputRef]);

	const handleFormSubmit = async (event) => {
		event.preventDefault();

		const url = (inputRef.current.value || defaultServerUrl).trim();

		await validateServerUrl(url);

		dispatch({ type: ADD_SERVER_VIEW_SERVER_ADDED, payload: url });

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
