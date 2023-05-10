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
  ButtonGroup,
} from '@rocket.chat/fuselage';
import React, { FC, useEffect, useRef, useState, ReactElement } from 'react';
import { useForm, Controller } from 'react-hook-form';
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

export type AuthPayload = {
  login: string;
  password: string;
  rememberCredentials?: boolean;
};

export const OutlookCredentialsDialog: FC = () => {
  const { t } = useTranslation();
  const openDialog = useSelector(({ openDialog }: RootState) => openDialog);
  const isVisible = openDialog === 'outlook-credentials';
  const dispatch = useDispatch<Dispatch<RootAction>>();

  const requestIdRef = useRef<unknown>();

  const [server, setServer] = useState<Server | undefined>();
  const [userId, setUserId] = useState<string>('');
  const [isEncryptionAvailable, setIsEncryptionAvailable] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    control,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<AuthPayload>({
    mode: 'onChange',
    defaultValues: { rememberCredentials: false },
  });

  const { rememberCredentials } = watch();

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

  const handleAuth = async ({
    login,
    password,
    rememberCredentials,
  }: AuthPayload): Promise<void> => {
    if (!server || !server?.outlookCredentials) {
      return;
    }

    dispatch({
      type: OUTLOOK_CALENDAR_SET_CREDENTIALS,
      payload: {
        url: server.url,
        outlookCredentials: {
          login,
          password,
          userId,
          serverUrl: server.outlookCredentials.serverUrl,
        },
        saveCredentials: rememberCredentials,
      },
      meta: {
        response: true,
        id: requestIdRef.current,
      },
    });
    resetField('password');
    resetField('login');
  };

  return (
    <Dialog isVisible={isVisible} onClose={handleCancel}>
      <Box minWidth='x336'>
        <Box fontScale='h3' mbe='x16'>
          Outlook Calendar app
        </Box>
        <FieldGroup>
          <Field>
            <Label>{t('Login')}</Label>
            <Field.Row>
              <TextInput {...register('login', { required: true })} />
            </Field.Row>
            {errors.login && <Field.Error>{t('Field_required')}</Field.Error>}
          </Field>
          <Field>
            <Label>{t('Password')}</Label>
            <Field.Row>
              <PasswordInput {...register('password', { required: true })} />
            </Field.Row>
            {errors.password && (
              <Field.Error>{t('Field_required')}</Field.Error>
            )}
          </Field>
          {!isEncryptionAvailable && rememberCredentials && (
            <Callout title='Encryption unavailable' type='warning'>
              Your operational system don't support encryption. <br />
              Your credentials will be stored in plain text.
            </Callout>
          )}
          <Field>
            <Field.Row>
              <Controller
                control={control}
                name='rememberCredentials'
                render={({ field: { onChange, value, ref } }): ReactElement => (
                  <CheckBox
                    ref={ref}
                    onChange={onChange}
                    checked={value}
                    id='check-box'
                  />
                )}
              />
              <Field.Label htmlFor='check-box'>
                {t('Remember_my_credentials')}
              </Field.Label>
            </Field.Row>
          </Field>
          <Box display='flex' alignItems='end' justifyContent='space-between'>
            <Margins block='x8'>
              <ButtonGroup>
                <Button onClick={handleCancel}>{t('Cancel')}</Button>
                <Button
                  primary
                  disabled={isSubmitting}
                  onClick={handleSubmit(handleAuth)}
                >
                  {t('Submit')}
                </Button>
              </ButtonGroup>
            </Margins>
          </Box>
        </FieldGroup>
      </Box>
    </Dialog>
  );
};
