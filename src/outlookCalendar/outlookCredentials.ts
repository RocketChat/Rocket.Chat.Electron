import { safeStorage } from 'electron';
import {
  FolderId,
  CalendarView,
  DateTime,
  WellKnownFolderName,
  Appointment,
  BasePropertySet,
  PropertySet,
  ConfigurationApi,
  WebCredentials,
  ExchangeService,
  ExchangeVersion,
  Uri,
} from 'ews-javascript-api';

import { Server } from '../servers/common';
import { dispatch } from '../store';
import { OUTLOOK_CALENDAR_SET_CREDENTIALS } from './actions';

export const setOutlookCredentials = async (
  url: Server['url'],
  login: string,
  password: string,
  serverUrl: string,
  userId: string
) => {
  const encryptedLogin = await safeStorage.encryptString(login);
  const encryptedPassword = await safeStorage.encryptString(password);
  dispatch({
    type: OUTLOOK_CALENDAR_SET_CREDENTIALS,
    payload: {
      url,
      outlookCredentials: {
        userId,
        serverUrl,
        login: encryptedLogin.toString(),
        password: encryptedPassword.toString(),
      },
    },
  });
};
