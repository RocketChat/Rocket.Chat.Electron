import {
	Box,
	Button,
	ButtonGroup,
	Callout,
	Field,
	FieldGroup,
	Margins,
	TextInput,
	Tile,
} from '@rocket.chat/fuselage';
import { useUniqueId, useAutoFocus } from '@rocket.chat/fuselage-hooks';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { takeEvery, race, call, delay } from 'redux-saga/effects';

import {
	ADD_SERVER_VIEW_SERVER_ADDED,
	CERTIFICATES_UPDATED,
} from '../../actions';
import { useSaga, useCallableSaga } from '../SagaMiddlewareProvider';
import { RocketChatLogo } from '../RocketChatLogo';
import { Wrapper, Content } from './styles';

const defaultServerUrl = 'https://open.rocket.chat';

export function AddServerView() {
	const isVisible = useSelector(({ currentServerUrl }) => currentServerUrl === null);
	const dispatch = useDispatch();
	const { t } = useTranslation();
	const [input, setInput] = useState('');

	const [validationState, setValidationState] = useState('idle');
	const [errorMessage, setErrorMessage] = useState(null);

	const validator = useCallableSaga(function *validateServerUrl(serverUrl, timeout = 5000) {
		const url = new URL(serverUrl);
		const headers = new Headers();

		if (url.username && url.password) {
			headers.set('Authorization', `Basic ${ btoa(`${ url.username }:${ url.password }`) }`);
		}

		const [response] = yield race([
			call(fetch, `${ url.href.replace(/\/$/, '') }/api/info`, { headers }),
			delay(timeout),
		]);

		if (!response) {
			// eslint-disable-next-line no-throw-literal
			throw 'timeout';
		}

		if (!response.ok) {
			// eslint-disable-next-line no-throw-literal
			throw 'invalid';
		}

		if (!(yield call(::response.json)).success) {
			// eslint-disable-next-line no-throw-literal
			throw 'invalid';
		}
	}, []);

	const validateServerUrl = useCallback(async (serverUrl) => {
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
	}, [t, validator]);

	useSaga(function *() {
		yield takeEvery(CERTIFICATES_UPDATED, function *() {
			validateServerUrl(input.trim());
		});
	}, [validateServerUrl, input]);

	const handleFormSubmit = async (event) => {
		event.preventDefault();

		const url = (input || defaultServerUrl).trim();

		await validateServerUrl(url);

		dispatch({ type: ADD_SERVER_VIEW_SERVER_ADDED, payload: url });

		setInput('');
	};

	const handleInputChange = (event) => {
		setInput(event.currentTarget.value);
	};

	const [isOnLine, setOnLine] = useState(navigator.onLine);

	useEffect(() => {
		const handleConnectionStatus = () => {
			setOnLine(navigator.onLine);
		};

		window.addEventListener('online', handleConnectionStatus);
		window.addEventListener('offline', handleConnectionStatus);

		return () => {
			window.removeEventListener('online', handleConnectionStatus);
			window.removeEventListener('offline', handleConnectionStatus);
		};
	}, []);

	const inputId = useUniqueId();
	const inputRef = useAutoFocus(isVisible);

	return <Wrapper isVisible={isVisible}>
		<Content>
			<Margins block='x16'>
				<Box>
					<RocketChatLogo alternate />
				</Box>
			</Margins>

			{isOnLine
				? <Tile is='form' padding='x32' method='/' onSubmit={handleFormSubmit}>
					<FieldGroup>
						<Field>
							<Field.Label htmlFor={inputId}>
								{t('landing.inputUrl')}
							</Field.Label>
							<Field.Row>
								<TextInput
									ref={inputRef}
									id={inputId}
									error={errorMessage}
									type='text'
									placeholder={defaultServerUrl}
									dir='auto'
									value={input}
									onChange={handleInputChange}
								/>
							</Field.Row>
							<Field.Error>
								{errorMessage}
							</Field.Error>
						</Field>

						<ButtonGroup align='center'>
							<Button type='submit' primary disabled={validationState !== 'idle'}>
								{(validationState === 'idle' && t('landing.connect'))
							|| (validationState === 'validating' && t('landing.validating'))
							|| (validationState === 'invalid' && t('landing.invalidUrl'))}
							</Button>
						</ButtonGroup>
					</FieldGroup>
				</Tile>
				: <Callout type='warning'>
					{t('error.offline')}
				</Callout>}
		</Content>
	</Wrapper>;
}
