import { contextIsolated } from 'process';

import {
  Box,
  Button,
  InputBox,
  Label,
  Margins,
  Scrollable,
  Tile,
} from '@rocket.chat/fuselage';
import React, { ChangeEvent, FC, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import { Dispatch } from 'redux';

import {
  OUTLOOK_CALENDAR_ASK_CREDENTIALS,
  OUTLOOK_CALENDAR_SET_CREDENTIALS,
} from '../../../outlookCalendar/actions';
import { Server } from '../../../servers/common';
import { listen } from '../../../store';
import { RootAction } from '../../../store/actions';
import { RootState } from '../../../store/rootReducer';
import { Dialog } from '../Dialog';

export const OutlookCredentialsDialog: FC = () => {
  const openDialog = useSelector(({ openDialog }: RootState) => openDialog);
  const isVisible = openDialog === 'outlook-credentials';
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const [outlookUsername, setOutlookUsername] = useState('');
  const [outlookPassword, setOutlookPassword] = useState('');
  const [server, setServer] = useState<Server | undefined>();
  const [userId, setUserId] = useState<string>('');

  const requestIdRef = useRef<unknown>();

  useEffect(
    () =>
      listen(OUTLOOK_CALENDAR_ASK_CREDENTIALS, (action) => {
        setServer(action.payload.server);
        setUserId(action.payload.userId);
      }),
    [dispatch]
  );

  useEffect(() => console.log('server', server), [server]);

  const handleClose = (): void => {
    dispatch({
      type: OUTLOOK_CALENDAR_DIALOG_DISMISSED,
      meta: {
        response: true,
        id: requestIdRef.current,
      },
    });
  };

  const handlePasswordChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setOutlookPassword(event.currentTarget.value);
  };

  const handleUsernameChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setOutlookUsername(event.currentTarget.value);
  };

  const handleSubmit = (): void => {
    console.log('handleSubmit');
    dispatch({
      type: OUTLOOK_CALENDAR_SET_CREDENTIALS,
      payload: {
        url: server?.url,
        outlookCredentials: {
          username: outlookUsername,
          password: outlookPassword,
          userId,
          serverUrl: server?.outlookCredentials?.serverUrl,
        },
      },
    });
  };

  const { t } = useTranslation();

  return (
    <Dialog isVisible={isVisible} onClose={handleClose}>
      <Box fontScale='h3'>Please enter your Outlook credentials</Box>

      <Box fontScale='h5'>for server :</Box>
      <Box
        display='flex'
        flexDirection='row'
        flexWrap='nowrap'
        alignItems='center'
      >
        <Margins block='x8'>
          <Label>Username</Label>
          <InputBox
            type='text'
            defaultValue=''
            onChange={handleUsernameChange}
          />
          <Label>Password</Label>
          <InputBox
            type='password'
            defaultValue='Password'
            onChange={handlePasswordChange}
          />
        </Margins>
      </Box>
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
    </Dialog>
  );
};
