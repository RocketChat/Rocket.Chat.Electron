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

export const checkOutlookConnection = async (
  credendials: Server['outlookCredentials']
): Promise<boolean> => {
  console.log('checkOutlookConnection', credendials);
  if (!credendials) return false;
  // if (!credendials.login || !credendials.password) return false;
  const { serverUrl, login, password } = credendials;
  // const decryptedLogin = await safeStorage.decryptString(login);
  // const decryptedPassword = await safeStorage.decryptString(password);

  const exchange = new ExchangeService(ExchangeVersion.Exchange2013);
  exchange.Credentials = new WebCredentials('DEV-DC\\pierre', '--20CAceta');
  exchange.Url = new Uri(serverUrl);
  // eslint-disable-next-line new-cap
  let response = [];
  try {
    response = await exchange.GetAppManifests();
    console.log('response', response);
  } catch (e) {
    console.log('error', e);
    return false;
  }

  return response.length < 0;
};
