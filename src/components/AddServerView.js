import { useTranslation } from 'react-i18next';
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { takeEvery } from 'redux-saga/effects';

import {
	ADD_SERVER_VIEW_SERVER_ADDED,
	CERTIFICATES_UPDATED,
} from '../actions';
import { useSaga } from './SagaMiddlewareProvider';
import { useServerValidation } from '../hooks/useServerValidation';

export function AddServerView({
	defaultServerUrl = 'https://open.rocket.chat',
	hasSidebar,
	visible,
}) {
	const dispatch = useDispatch();
	const { t } = useTranslation();
	const [input, setInput] = useState('');
	const inputRef = useRef();

	useEffect(() => {
		if (!visible) {
			return;
		}

		inputRef.current.focus();
	}, [visible]);

	const [validationState, setValidationState] = useState('idle');
	const [errorMessage, setErrorMessage] = useState(null);

	const validator = useServerValidation();

	const validateServerUrl = async (serverUrl) => {
		setInput(serverUrl);

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
					case 'timeout':
						setErrorMessage(t('error.connectTimeout'));
						break;
					case 'invalid':
					default:
						setErrorMessage(t('error.noValidServerFound'));
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

	useSaga(function *() {
		yield takeEvery(CERTIFICATES_UPDATED, function *() {
			validateServerUrl(input.trim());
		});
	}, [input, validator]);

	const handleFormSubmit = async (event) => {
		event.preventDefault();

		const url = (input || defaultServerUrl).trim();

		await validateServerUrl(url);

		dispatch({ type: ADD_SERVER_VIEW_SERVER_ADDED, payload: url });

		setInput('');
	};

	const handleInputBlur = () => {
		validateServerUrl(input.trim());
	};

	const handleInputChange = (event) => {
		setInput(event.currentTarget.value);
	};

	return <section className={['add-server-view', !visible && 'hidden', !hasSidebar && 'add-server-view--without-side-bar'].filter(Boolean).join(' ')}>
		<div className='wrapper'>
			<header>
				<img className='logo' src='./images/logo-dark.svg' />
			</header>

			<div className='loading-indicator'>
				<span className='dot'></span>
				<span className='dot'></span>
				<span className='dot'></span>
			</div>

			<form className='add-server-form' method='/' onSubmit={handleFormSubmit}>
				<header>
					<h2 className='add-server-prompt'>
						{t('landing.inputUrl')}
					</h2>
				</header>
				<div className='fields'>
					<div className='input-text active'>
						<input
							ref={inputRef}
							className={['add-server-input', validationState === 'invalid' && 'wrong'].filter(Boolean).join(' ')}
							type='text'
							placeholder='https://open.rocket.chat'
							dir='auto'
							value={input}
							onBlur={handleInputBlur}
							onChange={handleInputChange}
						/>
					</div>
				</div>

				<div className={['add-server-error-message', 'alert', 'alert-danger', validationState !== 'invalid' && 'hidden'].filter(Boolean).join(' ')}>
					{errorMessage}
				</div>

				<div className='add-server-offline-error alert alert-danger only-offline'>
					{t('error.offline')}
				</div>

				<div className='submit'>
					<button type='submit' className='button primary add-server-button' disabled={validationState !== 'idle'}>
						{(validationState === 'idle' && t('landing.connect'))
						|| (validationState === 'validating' && t('landing.validating'))
						|| (validationState === 'invalid' && t('landing.invalidUrl'))}
					</button>
				</div>
			</form>
		</div>
	</section>;
}
