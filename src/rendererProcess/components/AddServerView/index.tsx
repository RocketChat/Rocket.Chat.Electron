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
import React, {
  useCallback,
  useEffect,
  useState,
  useMemo,
  FC,
  FormEvent,
  ChangeEvent,
} from 'react';
import { useTranslation } from 'react-i18next';

import * as serverActions from '../../../common/actions/serverActions';
import { RocketChatLogo } from '../../../common/components/assets/RocketChatLogo';
import { useAppDispatch } from '../../../common/hooks/useAppDispatch';
import { useAppSelector } from '../../../common/hooks/useAppSelector';
import { ServerUrlResolutionStatus } from '../../../common/types/ServerUrlResolutionStatus';
import { resolveServerUrl } from '../../resolveServerUrl';
import { Wrapper } from './styles';

const defaultServerUrl = new URL('https://open.rocket.chat/');

export const AddServerView: FC = () => {
  const isVisible = useAppSelector(
    ({ ui: { view } }) => view === 'add-new-server'
  );
  const dispatch = useAppDispatch();
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
    (url: string): void => {
      editInput('');
      dispatch(serverActions.added(url));
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

  const resolveAndValidateServerUrl = useCallback(
    async (serverUrl): Promise<void> => {
      beginValidation();

      const [resolvedServerUrl, result] = await resolveServerUrl(serverUrl);

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

    await resolveAndValidateServerUrl(trimmedInput);
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

  const inputId = useUniqueId();
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
              <Field.Label htmlFor={inputId}>
                {t('landing.inputUrl')}
              </Field.Label>
              <Field.Row>
                <TextInput
                  ref={inputRef}
                  id={inputId}
                  error={errorMessage ?? undefined}
                  type='text'
                  placeholder={defaultServerUrl.href}
                  dir='auto'
                  value={input}
                  onChange={handleInputChange}
                />
              </Field.Row>
              <Field.Error>{errorMessage}</Field.Error>
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
