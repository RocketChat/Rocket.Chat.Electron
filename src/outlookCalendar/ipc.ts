import { error } from 'console';

import axios from 'axios';
import { app, safeStorage } from 'electron';

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

const isEncryptionAvailable = safeStorage.isEncryptionAvailable();

const getServerInformationByWebContentsId = (webContentsId: number): Server => {
  const { servers } = select(selectPersistableValues);
  const server = servers.find(
    (server) => server.webContentsId === webContentsId
  );
  return server || ({} as Server);
};

export async function sendEventsToChatServer(
  appointments: AppointmentData[],
  serverUrl: string,
  userId: string,
  token: string
) {
  try {
    const response = await axios.post(
      `${serverUrl}/api/v1/calendar-events.import`,
      {
        appointments,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token,
          'X-User-Id': userId,
        },
      }
    );

    console.log('Message sent:', response.data);
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

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
let userAPIToken: string;

async function recurringSyncTask(server: Server) {
  try {
    console.log('recurringSyncTask');
    if (!userAPIToken) throw new Error('No user token');
    if (!server.outlookCredentials) throw new Error('No credentials');
    if (!checkIfCredentialsAreNotEmpty(server.outlookCredentials))
      throw new Error('Credentials are empty');

    let appointments: AppointmentData[] = [];
    try {
      console.log('server.outlookCredentials', server.outlookCredentials);
      const credentials = isEncryptionAvailable
        ? decryptedCredentials(server.outlookCredentials)
        : server.outlookCredentials;
      console.log('credentials', credentials);
      appointments = await getOutlookEvents(credentials, new Date(Date.now()));
      sendEventsToChatServer(
        appointments,
        server.url,
        server.outlookCredentials.userId,
        userAPIToken
      );
    } catch (e) {
      console.error('Error sending events to server', e);
    }
    console.log('appointments', appointments);
    console.log('Recurring task executed');
  } catch (error) {
    console.error('Error occurred:', error);
    clearInterval(recurringSyncTaskId);
  }
}

function startRecurringSyncTask(server: Server) {
  console.log('startRecurringSyncTask');
  if (!userAPIToken) return;
  console.log('token', userAPIToken);
  recurringSyncTaskId = setInterval(() => recurringSyncTask(server), 2000);
}

export const startOutlookCalendarUrlHandler = (): void => {
  handle('outlook-calendar/set-user-token', async (event, token, userId) => {
    console.log('handle set-user-token', token, userId);
    userAPIToken = token;
    const server = getServerInformationByWebContentsId(event.id);
    if (!server) return;
    console.log('server', server);
    const { outlookCredentials } = server;
    console.log('outlookCredentials', outlookCredentials);
    if (!outlookCredentials) return;
    if (outlookCredentials.userId !== userId || !userAPIToken) return;
    console.log('with userId and token', userId, userAPIToken);
    if (!checkIfCredentialsAreNotEmpty(outlookCredentials)) return;
    console.log('with non empty credentials');
    console.log('isEncryptionAvailable', isEncryptionAvailable);
    const credentials = isEncryptionAvailable
      ? decryptedCredentials(outlookCredentials)
      : outlookCredentials;
    console.log('creating recurringSyncTask', credentials, token);
    startRecurringSyncTask(server);
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
        startRecurringSyncTask(server);
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
