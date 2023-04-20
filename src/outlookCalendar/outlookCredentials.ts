import { safeStorage } from 'electron';
import {
  ExchangeService,
  ExchangeVersion,
  Uri,
  WebCredentials,
} from 'ews-javascript-api';

import { getServerUrl } from '../servers/preload/urls';
import { dispatch } from '../store';
import { OUTLOOK_CALENDAR_SET_CREDENTIALS } from './actions';

let outlookExchangeService = null;

export const setOutlookCredentials = async (
  login: string,
  password: string
) => {
  console.log(safeStorage.isEncryptionAvailable());
  const encriptedLogin = await safeStorage.encryptString(login);
  const encriptedPassword = await safeStorage.encryptString(password);
  console.log('getServerUrl', getServerUrl());
  dispatch({
    type: OUTLOOK_CALENDAR_SET_CREDENTIALS,
    payload: {
      url: 'http://localhost:3000/',
      outlookCredentials: {
        userId: '',
        serverUrl: '',
        login: encriptedLogin.toString(),
        password: encriptedPassword.toString(),
      },
    },
  });
};

export const createOutlookExchangeService = async () => {
  if (!outlookExchangeService) {
    outlookExchangeService = new ExchangeService(ExchangeVersion.Exchange2013);
  }

  const outlookUser = `${process.env.OUTLOOK_DOMAIN}\\${process.env.OUTLOOK_USER}`;
  const outlookPassword = process.env.OUTLOOK_PASSWORD || '';
  const outlookServer = process.env.OUTLOOK_SERVER || '';

  // exchange.Credentials = new TokenCredentials(token);
  outlookExchangeService.Credentials = new WebCredentials(
    outlookUser,
    outlookPassword
  );
  // exchange.Url = new Uri(server);
  outlookExchangeService.Url = new Uri(outlookServer);

  try {
    // eslint-disable-next-line new-cap
    const manifest = await outlookExchangeService.GetAppManifests();
    return outlookExchangeService;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const checkOutlookConnection = async () => {
  const outlookExchangeService = await createOutlookExchangeService();

  if (outlookExchangeService) {
    return true;
  }
  return false;
};

export const setOutlookExchangeUrl = async (url: string) => {
  outlookExchangeService.Url = new Uri(url);
};
