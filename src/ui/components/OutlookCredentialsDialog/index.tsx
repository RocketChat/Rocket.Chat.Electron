import {
  Box,
  Button,
  Callout,
  CheckBox,
  Field,
  FieldGroup,
  Label,
  Margins,
  PasswordInput,
  TextInput,
} from '@rocket.chat/fuselage';
import React, { ChangeEvent, FC, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import { Dispatch } from 'redux';

import {
  OUTLOOK_CALENDAR_ASK_CREDENTIALS,
  OUTLOOK_CALENDAR_DIALOG_DISMISSED,
  OUTLOOK_CALENDAR_SET_CREDENTIALS,
} from '../../../outlookCalendar/actions';
import { Server } from '../../../servers/common';
import { listen } from '../../../store';
import { RootAction } from '../../../store/actions';
import { isRequest } from '../../../store/fsa';
import { RootState } from '../../../store/rootReducer';
import { Dialog } from '../Dialog';

export const OutlookCredentialsDialog: FC = () => {
  const openDialog = useSelector(({ openDialog }: RootState) => openDialog);
  const isVisible = openDialog === 'outlook-credentials';
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const [server, setServer] = useState<Server | undefined>();
  const [userId, setUserId] = useState<string>('');
  const [isEncryptionAvailable, setIsEncryptionAvailable] = useState(false);
  const [saveCredentials, setSaveCredentials] = useState(false);

  const requestIdRef = useRef<unknown>();

  const [outlookLogin, setOutlookLogin] = useState<InputState>({
    value: '',
    required: false,
  });
  const [outlookPassword, setOutlookPassword] = useState<InputState>({
    value: '',
    required: false,
  });

  function handleInputChange(
    setState: React.Dispatch<React.SetStateAction<InputState>>
  ) {
    return function (event: React.ChangeEvent<HTMLInputElement>) {
      setState((prevState) => ({
        ...prevState,
        value: event.target.value,
        required: event.target.value.trim() === '',
      }));
    };
  }

  useEffect(
    () =>
      listen(OUTLOOK_CALENDAR_ASK_CREDENTIALS, async (action) => {
        if (!isRequest(action)) {
          return;
        }
        requestIdRef.current = action.meta.id;
        setServer(action.payload.server);
        setUserId(action.payload.userId);
        setIsEncryptionAvailable(action.payload.isEncryptionAvailable);
      }),
    [dispatch]
  );

  const handleCancel = (): void => {
    dispatch({
      type: OUTLOOK_CALENDAR_DIALOG_DISMISSED,
      payload: { dismissDialog: true },
      meta: {
        response: true,
        id: requestIdRef.current,
      },
    });
  };

  interface InputState {
    value: string;
    required: boolean;
  }

  const handleSaveCredentialsCheckboxChange = (
    event: ChangeEvent<HTMLInputElement>
  ): void => {
    setSaveCredentials(event.target.checked);
  };

  function handleInputBlur(
    setState: React.Dispatch<React.SetStateAction<InputState>>
  ) {
    return function () {
      console.log('handleInputBlur');
      setState((prevState) => ({
        ...prevState,
        required: prevState.value.trim() === '',
      }));
    };
  }

  const handleSubmit = async (): Promise<void> => {
    if (
      !server ||
      !server.outlookCredentials ||
      outlookLogin.value === '' ||
      outlookPassword.value === ''
    ) {
      console.log('empty fields');
      handleInputBlur(setOutlookLogin)();
      handleInputBlur(setOutlookPassword)();
      return;
    }

    dispatch({
      type: OUTLOOK_CALENDAR_SET_CREDENTIALS,
      payload: {
        url: server.url,
        outlookCredentials: {
          login: outlookLogin.value,
          password: outlookPassword.value,
          userId,
          serverUrl: server.outlookCredentials.serverUrl,
        },
        saveCredentials,
      },
      meta: {
        response: true,
        id: requestIdRef.current,
      },
    });
  };

  const { t } = useTranslation();

  return (
    <Dialog isVisible={isVisible} onClose={handleCancel}>
      <Box fontScale='h3'>Please enter your Outlook credentials</Box>
      <FieldGroup>
        <Field>
          <Label>{t('Login')}</Label>
          <Field.Row>
            <TextInput
              onChange={handleInputChange(setOutlookLogin)}
              onBlur={handleInputBlur(setOutlookLogin)}
              required={outlookLogin.required}
            />
          </Field.Row>
          {outlookLogin.required && (
            <Field.Error>{t('Field_required')}</Field.Error>
          )}
        </Field>
        <Field>
          <Label>{t('Password')}</Label>
          <Field.Row>
            <PasswordInput
              onChange={handleInputChange(setOutlookPassword)}
              onBlur={handleInputBlur(setOutlookPassword)}
              required={outlookPassword.required}
            />
          </Field.Row>
          {outlookPassword.required && (
            <Field.Error>{t('Field_required')}</Field.Error>
          )}
        </Field>
        {!isEncryptionAvailable && saveCredentials && (
          <Callout title='Encryption unavailable' type='warning'>
            Your operational system don't support encryption. <br />
            Your credentials will be stored in plain text.
          </Callout>
        )}
        <Field>
          <Field.Row>
            <CheckBox
              id='check-box'
              default={false}
              onChange={handleSaveCredentialsCheckboxChange}
            />
            <Field.Label htmlFor='check-box'>
              Remember my credentials
            </Field.Label>
          </Field.Row>
        </Field>
        <Box display='flex' alignItems='end' justifyContent='space-between'>
          <Margins block='x8'>
            <Button danger onClick={handleCancel}>
              {t('Cancel')}
            </Button>
            <Button primary onClick={handleSubmit}>
              {t('Submit')}
            </Button>
          </Margins>
        </Box>
      </FieldGroup>
    </Dialog>
  );
};
