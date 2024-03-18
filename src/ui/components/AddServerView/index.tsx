import {
  Button,
  ButtonGroup,
  Callout,
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldRow,
  Margins,
  TextInput,
  Tile,
} from '@rocket.chat/fuselage';
import { useAutoFocus } from '@rocket.chat/fuselage-hooks';
import type { FormEvent, ChangeEvent } from 'react';
import { useCallback, useEffect, useState, useMemo, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import {
  SERVER_URL_RESOLVED,
  SERVER_URL_RESOLUTION_REQUESTED,
} from '../../../servers/actions';
import { ServerUrlResolutionStatus } from '../../../servers/common';
import { request } from '../../../store';
import type { RootAction } from '../../../store/actions';
import type { RootState } from '../../../store/rootReducer';
import * as urls from '../../../urls';
import { ADD_SERVER_VIEW_SERVER_ADDED } from '../../actions';
import { RocketChatLogo } from '../RocketChatLogo';
import { Wrapper } from './styles';

const defaultServerUrl = new URL(urls.open);

export const AddServerView = () => {
  const isVisible = useSelector(
    ({ currentView }: RootState) => currentView === 'add-new-server'
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();
  const [input, setInput] = useState('');

  const idleState = useMemo(() => ['idle', null] as const, []);
  const [[validationState, errorMessage], setValidation] = useState<
    | readonly [state: 'idle', message: null]
    | readonly [state: 'validating', message: null]
    | readonly [state: 'invalid', message: string | null]
  >(idleState);

  const editInput = useCallback(
    (input: string): void => {
      setInput(input);
      setValidation(idleState);
    },
    [idleState]
  );

  const addServer = useCallback(
    (serverUrl: string): void => {
      editInput('');
      dispatch({
        type: ADD_SERVER_VIEW_SERVER_ADDED,
        payload: serverUrl,
      });
    },
    [dispatch, editInput]
  );

  const beginValidation = useCallback((): void => {
    setValidation(['validating', null]);
  }, []);

  const failValidation = useCallback(
    (serverUrl: string, message: string | null): void => {
      setInput(serverUrl);
      setValidation(['invalid', message]);
    },
    []
  );

  const resolveServerUrl = useCallback(
    async (serverUrl: string): Promise<void> => {
      beginValidation();

      const [resolvedServerUrl, result] = await request(
        {
          type: SERVER_URL_RESOLUTION_REQUESTED,
          payload: serverUrl,
        },
        SERVER_URL_RESOLVED
      );

      switch (result) {
        case ServerUrlResolutionStatus.OK:
          addServer(resolvedServerUrl);
          return;

        case ServerUrlResolutionStatus.INVALID_URL:
        case ServerUrlResolutionStatus.INVALID:
          failValidation(resolvedServerUrl, t('error.noValidServerFound'));
          return;

        case ServerUrlResolutionStatus.TIMEOUT:
          failValidation(resolvedServerUrl, t('error.connectTimeout'));
          return;

        default:
          failValidation(resolvedServerUrl, null);
      }
    },
    [addServer, beginValidation, failValidation, t]
  );

  const handleFormSubmit = async (
    event: FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();

    const trimmedInput = input.trim();

    if (!trimmedInput) {
      addServer(defaultServerUrl.href);
      return;
    }

    await resolveServerUrl(trimmedInput);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    editInput(event.currentTarget.value);
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

  const inputId = useId();
  const inputRef = useAutoFocus(isVisible);

  if (!isVisible) {
    return null;
  }

  return (
    <Wrapper>
      {isOnLine ? (
        <Tile
          is='form'
          width='x368'
          maxWidth='100%'
          padding='x24'
          method='/'
          onSubmit={handleFormSubmit}
        >
          <Margins block='x16'>
            <RocketChatLogo />
          </Margins>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={inputId}>{t('landing.inputUrl')}</FieldLabel>
              <FieldRow>
                <TextInput
                  ref={inputRef as React.Ref<HTMLInputElement>}
                  id={inputId}
                  placeholder={defaultServerUrl.href}
                  error={errorMessage ?? undefined}
                  value={input}
                  dir='auto'
                  onChange={handleInputChange}
                />
              </FieldRow>
              <FieldError>{errorMessage}</FieldError>
            </Field>

            <ButtonGroup align='center'>
              <Button
                type='submit'
                primary
                disabled={validationState !== 'idle'}
              >
                {(validationState === 'idle' && t('landing.connect')) ||
                  (validationState === 'validating' &&
                    t('landing.validating')) ||
                  (validationState === 'invalid' && t('landing.invalidUrl'))}
              </Button>
            </ButtonGroup>
          </FieldGroup>
        </Tile>
      ) : (
        <Callout type='warning' width='x368' maxWidth='100%'>
          {t('error.offline')}
        </Callout>
      )}
    </Wrapper>
  );
};
