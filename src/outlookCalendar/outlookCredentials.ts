import { safeStorage } from 'electron';
import {
  ExchangeService,
  ExchangeVersion,
  Uri,
  WebCredentials,
} from 'ews-javascript-api';

import { Server } from '../servers/common';
import { getOutlookEvents } from './getOutlookEvents';

let outlookExchangeService = null;

export const setOutlookCredentials = async (
  login: string,
  password: string
) => {
  console.log(safeStorage.isEncryptionAvailable());
  const encriptedLogin = await safeStorage.encryptString(login);
  const encriptedPassword = await safeStorage.encryptString(password);

  console.log('login', encriptedLogin.toString());
  console.log('password', encriptedPassword.toString());

  console.log('login', safeStorage.decryptString(encriptedLogin).toString());
  console.log(
    'password',
    safeStorage.decryptString(encriptedPassword).toString()
  );
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
    console.log(manifest);
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
