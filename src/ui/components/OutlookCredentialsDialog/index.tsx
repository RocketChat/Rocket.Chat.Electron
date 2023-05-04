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
  const [outlookLogin, setOutlookLogin] = useState('');
  const [outlookPassword, setOutlookPassword] = useState('');
  const [server, setServer] = useState<Server | undefined>();
  const [userId, setUserId] = useState<string>('');
  const [isEncryptionAvailable, setIsEncryptionAvailable] = useState(false);
  const [saveCredentials, setSaveCredentials] = useState(false);

  const requestIdRef = useRef<unknown>();

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

  const handleClose = (): void => {
    dispatch({
      type: OUTLOOK_CALENDAR_DIALOG_DISMISSED,
      payload: { dismissDialog: true },
      meta: {
        response: true,
        id: requestIdRef.current,
      },
    });
  };

  const handlePasswordChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setOutlookPassword(event.currentTarget.value);
  };

  const handleLoginChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setOutlookLogin(event.currentTarget.value);
  };

  const handleSaveCredentialsCheckboxChange = (
    event: ChangeEvent<HTMLInputElement>
  ): void => {
    setSaveCredentials(event.target.checked);
  };

  const handleSubmit = (): void => {
    if (!server || !server.outlookCredentials) return;

    dispatch({
      type: OUTLOOK_CALENDAR_SET_CREDENTIALS,
      payload: {
        url: server.url,
        outlookCredentials: {
          login: outlookLogin,
          password: outlookPassword,
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
    <Dialog isVisible={isVisible} onClose={handleClose}>
      <Box fontScale='h3'>Please enter your Outlook credentials</Box>
      <FieldGroup>
        <Field>
          <Label>{t('Login')}</Label>
          <Field.Row>
            <TextInput onChange={handleLoginChange} />
          </Field.Row>
        </Field>
        <Field>
          <Label>{t('Password')}</Label>
          <Field.Row>
            <PasswordInput onChange={handlePasswordChange} />
          </Field.Row>
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
        <Box>
          <Margins block='x8'>
            <Button danger onClick={handleClose}>
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
