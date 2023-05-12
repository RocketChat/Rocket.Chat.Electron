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
import type {
  OutlookCredentials,
  AppointmentData,
  OutlookEventsResponse,
} from './type';

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

let recurringSyncTaskId: NodeJS.Timeout;

async function recurringSyncTask(
  credentials: OutlookCredentials,
  token: string
) {
  try {
    console.log('recurringSyncTask');
    console.log('token', token);
    let appointments: AppointmentData[] = [];
    try {
      appointments = await getOutlookEvents(credentials, new Date(Date.now()));
    } catch (e) {
      console.error('error', e);
    }
    console.log('appointments', appointments);
    console.log('Recurring task executed');
  } catch (error) {
    console.error('Error occurred:', error);
    clearInterval(recurringSyncTaskId);
  }
}

let userRocketApiToken: string;

function startRecurringSyncTask(credentials: OutlookCredentials) {
  console.log('startRecurringSyncTask');
  if (!userRocketApiToken) return;
  console.log('token', userRocketApiToken);
  recurringSyncTaskId = setInterval(
    () => recurringSyncTask(credentials, userRocketApiToken),
    2000
  );
}

export const startOutlookCalendarUrlHandler = (): void => {
  handle('outlook-calendar/set-user-token', async (event, token, userId) => {
    userRocketApiToken = token;
    console.log('handle set-user-token', token, userId);
    const server = getServerInformationByWebContentsId(event.id);
    if (!server) return;
    console.log('server', server);
    const { outlookCredentials } = server;
    console.log('outlookCredentials', outlookCredentials);
    if (!outlookCredentials) return;
    if (outlookCredentials.userId !== userId || !userRocketApiToken) return;
    console.log('with userId and token', userId, token);
    if (!checkIfCredentialsAreNotEmpty(outlookCredentials)) return;
    console.log('with non empty credentials');
    const isEncryptionAvailable = await safeStorage.isEncryptionAvailable();
    console.log('isEncryptionAvailable', isEncryptionAvailable);
    const credentials = isEncryptionAvailable
      ? decryptedCredentials(outlookCredentials)
      : outlookCredentials;
    console.log('creating recurringSyncTask', credentials, token);
    startRecurringSyncTask(credentials);
  });

  handle('outlook-calendar/clear-credentials', async (event) => {
    const server = getServerInformationByWebContentsId(event.id);
    if (!server) return;
    const { outlookCredentials } = server;
    if (!outlookCredentials) return;
    dispatch({
      type: OUTLOOK_CALENDAR_SAVE_CREDENTIALS,
      payload: {
        url: server.url,
        outlookCredentials: {
          userId: outlookCredentials.userId,
          serverUrl: outlookCredentials.serverUrl,
          login: '',
          password: '',
        },
      },
    });
  });

  handle(
    'outlook-calendar/set-exchange-url',
    async (event, url: string, userId: string) => {
      console.log('handle set-exchange-url', url, userId);
      const server = getServerInformationByWebContentsId(event.id);
      if (!server) return;
      const { outlookCredentials } = server;
      if (
        outlookCredentials?.userId !== userId ||
        outlookCredentials?.serverUrl !== url
      ) {
        dispatch({
          type: OUTLOOK_CALENDAR_SAVE_CREDENTIALS,
          payload: {
            url: server.url,
            outlookCredentials: {
              userId,
              serverUrl: url,
              login: '',
              password: '',
            },
          },
        });
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
        startRecurringSyncTask(credentials);
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
