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
import { useTranslation } from 'react-i18next';
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { takeEvery } from 'redux-saga/effects';

import {
	ADD_SERVER_VIEW_SERVER_ADDED,
	CERTIFICATES_UPDATED,
} from '../../actions';
import { useSaga } from '../SagaMiddlewareProvider';
import { useServerValidation } from '../../hooks/useServerValidation';
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

	const [inputId] = useState(() => Math.random().toString(36).slice(2));
	const inputRef = useRef();

	useEffect(() => {
		if (!isVisible || !inputRef.current) {
			return;
		}

		inputRef.current.focus();
	}, [isVisible]);

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
