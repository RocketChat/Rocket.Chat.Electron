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
  FieldRow,
  FieldError,
  FieldLabel,
} from '@rocket.chat/fuselage';
import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import type { Dispatch } from 'redux';

import {
  OUTLOOK_CALENDAR_ASK_CREDENTIALS,
  OUTLOOK_CALENDAR_DIALOG_DISMISSED,
  OUTLOOK_CALENDAR_SET_CREDENTIALS,
} from '../../../outlookCalendar/actions';
import type { Server } from '../../../servers/common';
import { listen } from '../../../store';
import type { RootAction } from '../../../store/actions';
import { isRequest } from '../../../store/fsa';
import type { RootState } from '../../../store/rootReducer';
import { Dialog } from '../Dialog';

export type AuthPayload = {
  login: string;
  password: string;
  rememberCredentials?: boolean;
};

export const OutlookCredentialsDialog = () => {
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

    resetField('password');
    resetField('login');
    resetField('rememberCredentials');
  };

  useEffect(() => {
    if (!isVisible) {
      return;
    }
    window.focus();
  }, [isVisible]);

  const handleAuth = async ({
    login,
    password,
    rememberCredentials,
  }: AuthPayload): Promise<void> => {
    if (!server?.outlookCredentials) {
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
    resetField('rememberCredentials');
  };

  return (
    <Dialog isVisible={isVisible} onClose={handleCancel}>
      <Box width='x336'>
        <Box fontScale='h3' mbe='x16'>
          {t('dialog.outlookCalendar.title')}
        </Box>
        <FieldGroup>
          <Field>
            <Label>{t('Login')}</Label>
            <FieldRow>
              <TextInput {...register('login', { required: true })} />
            </FieldRow>
            {errors.login && (
              <FieldError>
                {t('dialog.outlookCalendar.field_required')}
              </FieldError>
            )}
          </Field>
          <Field>
            <Label>{t('Password')}</Label>
            <FieldRow>
              <PasswordInput {...register('password', { required: true })} />
            </FieldRow>
            {errors.password && (
              <FieldError>
                {t('dialog.outlookCalendar.field_required')}
              </FieldError>
            )}
          </Field>
          {!isEncryptionAvailable && rememberCredentials && (
            <Callout
              title={t('dialog.outlookCalendar.encryptionUnavailableTitle')}
              type='warning'
            >
              {t('dialog.outlookCalendar.encryptionUnavailable')}
            </Callout>
          )}
          <Field>
            <FieldRow justifyContent='initial'>
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
              <FieldLabel mis={4} htmlFor='check-box'>
                {t('dialog.outlookCalendar.remember_credentials')}
              </FieldLabel>
            </FieldRow>
          </Field>
          <Box display='flex' alignItems='end' justifyContent='space-between'>
            <Margins block='x8'>
              <ButtonGroup>
                <Button onClick={handleCancel}>
                  {t('dialog.outlookCalendar.cancel')}
                </Button>
                <Button
                  primary
                  disabled={isSubmitting}
                  onClick={handleSubmit(handleAuth)}
                >
                  {t('dialog.outlookCalendar.submit')}
                </Button>
              </ButtonGroup>
            </Margins>
          </Box>
        </FieldGroup>
      </Box>
    </Dialog>
  );
};
