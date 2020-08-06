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
import { ipcRenderer } from 'electron';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import { ADD_SERVER_VIEW_SERVER_ADDED } from '../../actions';
import { QUERY_SERVER_VALIDATION, EVENT_CERTIFICATES_UPDATED } from '../../ipc';
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

	const validateServerUrl = useCallback(async (serverUrl) => {
		setInput(serverUrl);

		setValidationState('validating');
		setErrorMessage(null);

		if (!serverUrl.length) {
			setValidationState('idle');
			return;
		}

		const validationResult = await ipcRenderer.invoke(QUERY_SERVER_VALIDATION, serverUrl);

		if (validationResult === 'OK') {
			setValidationState('idle');
			return;
		}

		if (/^https?:\/\/.+/.test(serverUrl)) {
			setValidationState('invalid');

			if (validationResult === 'TIMEOUT') {
				setErrorMessage(t('error.connectTimeout'));
				return;
			}

			if (validationResult === 'INVALID') {
				setErrorMessage(t('error.noValidServerFound'));
				return;
			}
		}

		if (!/(^https?:\/\/)|(\.)|(^([^:]+:[^@]+@)?localhost(:\d+)?$)/.test(serverUrl)) {
			return validateServerUrl(`https://${ serverUrl }.rocket.chat`);
		}

		if (!/^https?:\/\//.test(serverUrl)) {
			return validateServerUrl(`https://${ serverUrl }`);
		}
	}, [t]);

	useEffect(() => {
		const handleCertificatesUpdatedEvent = () => {
			validateServerUrl(input.trim());
		};

		ipcRenderer.addListener(EVENT_CERTIFICATES_UPDATED, handleCertificatesUpdatedEvent);

		return () => {
			ipcRenderer.removeListener(EVENT_CERTIFICATES_UPDATED, handleCertificatesUpdatedEvent);
		};
	}, [input, validateServerUrl]);

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
