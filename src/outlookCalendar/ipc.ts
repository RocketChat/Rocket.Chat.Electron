import { safeStorage } from 'electron';

import { selectPersistableValues } from '../app/selectors';
import { handle } from '../ipc/main';
import { Server } from '../servers/common';
import { dispatch, request, select } from '../store';
import {
  OUTLOOK_CALENDAR_SET_CREDENTIALS,
  OUTLOOK_CALENDAR_ASK_CREDENTIALS,
  OUTLOOK_CALENDAR_DIALOG_DISMISSED,
  OUTLOOK_CALENDAR_SAVE_CREDENTIALS,
} from './actions';
import { getOutlookEvents } from './getOutlookEvents';
import type { OutlookCredentials, AppointmentData, OutlookEventsResponse } from './type';

const getServerInformationByWebContentsId = (webContentsId: number): Server => {
  const { servers } = select(selectPersistableValues);
  const server = servers.find(
    (server) => server.webContentsId === webContentsId
  );
  return server || ({} as Server);
};

function checkIfCredentialsAreNotEmpty(
  credentials: OutlookCredentials
): boolean {
  return (
    credentials.login.trim() !== '' &&
    credentials.password.trim() !== '' &&
    credentials.userId.trim() !== '' &&
    credentials.serverUrl.trim() !== ''
  );
}

function encryptedCredentials(
  credentials: OutlookCredentials
): OutlookCredentials {
  return {
    ...credentials,
    login: safeStorage.encryptString(credentials.login).toString('base64'),
    password: safeStorage
      .encryptString(credentials.password)
      .toString('base64'),
  };
}

function decryptedCredentials(
  credentials: OutlookCredentials
): OutlookCredentials {
  return {
    ...credentials,
    login: safeStorage
      .decryptString(Buffer.from(credentials.login, 'base64'))
      .toString(),
    password: safeStorage
      .decryptString(Buffer.from(credentials.password, 'base64'))
      .toString(),
  };
}

export const clearOutlookCredentials = (
  url: Server['url'],
  outlookCredentials: OutlookCredentials
): void => {
  const { userId, serverUrl } = outlookCredentials;
  dispatch({
    type: OUTLOOK_CALENDAR_SAVE_CREDENTIALS,
    payload: {
      url,
      outlookCredentials: {
        userId,
        serverUrl,
        login: '',
        password: '',
      },
    },
  });
};

export const startOutlookCalendarUrlHandler = (): void => {
  handle('outlook-calendar/clear-credentials', async (event) => {
    const server = getServerInformationByWebContentsId(event.id);
    if (!server) return;
    const { outlookCredentials } = server;
    if (!outlookCredentials) return;
    clearOutlookCredentials(server.url, outlookCredentials);
  });

  handle(
    'outlook-calendar/set-exchange-url',
    async (event, url: string, userId: string) => {
      const server = getServerInformationByWebContentsId(event.id);
      if (!server) return;
      const { outlookCredentials } = server;
      if (!outlookCredentials) return;
      if (
        outlookCredentials?.userId !== userId ||
        outlookCredentials?.serverUrl !== url
      ) {
        clearOutlookCredentials(server.url, outlookCredentials);
      }
    }
  );

  handle(
    'outlook-calendar/has-credentials',
    async (event): Promise<Promise<boolean>> => {
      const server = getServerInformationByWebContentsId(event.id);
      if (!server) return false;
      const { outlookCredentials } = server;
      if (!outlookCredentials) return false;
      return checkIfCredentialsAreNotEmpty(outlookCredentials);
    }
  );

  handle(
    'outlook-calendar/get-events',
    async (event, date: Date): Promise<OutlookEventsResponse> => {
      console.log('get-events');
      const server = getServerInformationByWebContentsId(event.id);
      const { outlookCredentials } = server;
      if (
        !outlookCredentials ||
        !outlookCredentials.userId ||
        !outlookCredentials.serverUrl
      ) {
        return Promise.reject(new Error('No credentials'));
      }

      const isEncryptionAvailable = await safeStorage.isEncryptionAvailable();
      let credentials: OutlookCredentials;
      let saveCredentials = false;
      if (!checkIfCredentialsAreNotEmpty(outlookCredentials)) {
        const response = await request(
          {
            type: OUTLOOK_CALENDAR_ASK_CREDENTIALS,
            payload: {
              server,
              userId: outlookCredentials.userId,
              isEncryptionAvailable,
            },
          },
          OUTLOOK_CALENDAR_SET_CREDENTIALS,
          OUTLOOK_CALENDAR_DIALOG_DISMISSED
        );

        if (response.dismissDialog === true) {
          return {
            status: 'canceled',
          };
        }

        if (!checkIfCredentialsAreNotEmpty(response?.outlookCredentials)) {
          return Promise.reject(new Error('Invalid credentials'));
        }

        credentials = response.outlookCredentials;
        saveCredentials = response.saveCredentials || false;
      } else {
        credentials = isEncryptionAvailable
          ? decryptedCredentials(outlookCredentials)
          : outlookCredentials;
      }

      let appointments: AppointmentData[] = [];
      try {
        appointments = await getOutlookEvents(credentials, date);
      } catch (e) {
        console.error('error', e);
        return Promise.reject(e);
      }

      if (saveCredentials) {
        dispatch({
          type: OUTLOOK_CALENDAR_SAVE_CREDENTIALS,
          payload: {
            url: server.url,
            outlookCredentials: isEncryptionAvailable
              ? encryptedCredentials(credentials)
              : credentials,
          },
        });
      }

      return {
        status: 'success',
        data: appointments,
      };
    }
  );
};
