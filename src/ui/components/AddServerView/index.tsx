import {
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
import React, { useCallback, useEffect, useState, useMemo, FC, FormEvent, ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { Dispatch } from 'redux';

import {
  SERVER_VALIDATION_RESPONDED,
  SERVER_VALIDATION_REQUESTED,
} from '../../../servers/actions';
import { ValidationResult } from '../../../servers/common';
import { request } from '../../../store';
import { RootAction } from '../../../store/actions';
import { RootState } from '../../../store/rootReducer';
import { ADD_SERVER_VIEW_SERVER_ADDED } from '../../actions';
import { RocketChatLogo } from '../RocketChatLogo';
import { Wrapper, Content } from './styles';

const defaultServerUrl = 'https://open.rocket.chat';

export const AddServerView: FC = () => {
  const currentServerUrl = useSelector(({ currentServerUrl }: RootState) => currentServerUrl);

  const isVisible = currentServerUrl === null;
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();
  const [input, setInput] = useState('');

  const idleState = useMemo(() => ['idle', null], []);
  const [[validationState, errorMessage], setValidation] = useState(idleState);

  const validateServerUrl = useCallback(async (serverUrl): Promise<boolean> => {
    setInput(serverUrl);

    setValidation(['validating', null]);

    if (!serverUrl.length) {
      setValidation(idleState);
      return false;
    }

    const validationResult = await request<
      typeof SERVER_VALIDATION_REQUESTED,
      typeof SERVER_VALIDATION_RESPONDED
    >({
      type: SERVER_VALIDATION_REQUESTED,
      payload: {
        serverUrl,
      },
    });

    if (validationResult === ValidationResult.OK) {
      setValidation(idleState);
      return true;
    }

    if (/^https?:\/\/.+/.test(serverUrl)) {
      if (validationResult === ValidationResult.TIMEOUT) {
        setValidation(['invalid', t('error.connectTimeout')]);
        return false;
      }

      if (validationResult === ValidationResult.INVALID) {
        setValidation(['invalid', t('error.noValidServerFound')]);
        return false;
      }

      setValidation(['invalid', null]);
      return false;
    }

    if (!/(^https?:\/\/)|(\.)|(^([^:]+:[^@]+@)?localhost(:\d+)?$)/.test(serverUrl)) {
      return validateServerUrl(`https://${ serverUrl }.rocket.chat`);
    }

    if (!/^https?:\/\//.test(serverUrl)) {
      return validateServerUrl(`https://${ serverUrl }`);
    }

    return true;
  }, [idleState, t]);

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    const serverUrl = (input || defaultServerUrl).trim();

    const permitted = await validateServerUrl(serverUrl);

    if (permitted) {
      dispatch({ type: ADD_SERVER_VIEW_SERVER_ADDED, payload: serverUrl });
      setInput('');
    }
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setInput(event.currentTarget.value);
    setValidation(idleState);
  };

  const [isOnLine, setOnLine] = useState(() => navigator.onLine);

  useEffect(() => {
    const handleConnectionStatus = (): void => {
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
      {isOnLine
        ? <Tile width='x368' is='form' padding='x24' method='/' onSubmit={handleFormSubmit}>
          <Margins block='x16'>
            <RocketChatLogo alternate />
          </Margins>
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
};
