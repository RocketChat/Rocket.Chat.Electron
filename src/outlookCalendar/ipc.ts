import axios from 'axios';
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

const isEncryptionAvailable = safeStorage.isEncryptionAvailable();

const getServerInformationByWebContentsId = (webContentsId: number): Server => {
  const { servers } = select(selectPersistableValues);
  const server = servers.find(
    (server) => server.webContentsId === webContentsId
  );
  return server || ({} as Server);
};

async function listEventsFromRocketChatServer(
  serverUrl: string,
  userId: string,
  token: string
) {
  try {
    const response = await axios.get(
      `${serverUrl}api/v1/calendar-events.list`,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token,
          'X-User-Id': userId,
        },
        params: {
          date: new Date().toISOString(),
        },
      }
    );
    console.log('response', response);
    return response.data;
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

async function createEventOnRocketChatServer(
  serverUrl: string,
  userId: string,
  token: string,
  event: AppointmentData
) {
  try {
    const response = await axios.post(
      `${serverUrl}api/v1/calendar-events.import`,
      {
        externalId: event.id,
        subject: event.subject,
        startTime: event.startTime,
        description: event.description,
        reminderMinutesBeforeStart: event.reminderMinutesBeforeStart,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token,
          'X-User-Id': userId,
        },
      }
    );
    console.log('createEventOnRocketChatServer response', response.data);
  } catch (error) {
    console.error('Error saving event on server:', error);
  }
}

async function updateEventOnRocketChatServer(
  serverUrl: string,
  userId: string,
  token: string,
  rocketChatEventId: string,
  event: AppointmentData
) {
  try {
    const response = await axios.post(
      `${serverUrl}api/v1/calendar-events.update`,
      {
        eventId: rocketChatEventId,
        subject: event.subject,
        startTime: event.startTime,
        description: event.description,
        reminderMinutesBeforeStart: event.reminderMinutesBeforeStart,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token,
          'X-User-Id': userId,
        },
      }
    );
    console.log('updateventOnRocketChatServer response');
  } catch (error) {
    console.error('Error updating event on server:', error);
  }
}

async function deleteEventOnRocketChatServer(
  serverUrl: string,
  userId: string,
  token: string,
  rocketChatEventId: string
) {
  try {
    const response = await axios.post(
      `${serverUrl}api/v1/calendar-events.delete`,
      {
        eventId: rocketChatEventId,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token,
          'X-User-Id': userId,
        },
      }
    );
    console.log('deleteEventOnRocketChatServer response');
  } catch (error) {
    console.error('Error deleting event on server:', error);
  }
}

export async function syncEventsWithRocketChatServer(
  server: Server,
  token: string
) {
  if (!server.outlookCredentials) return;
  const credentials = isEncryptionAvailable
    ? decryptedCredentials(server.outlookCredentials)
    : server.outlookCredentials;

  const eventsOnOutlookServer = await getOutlookEvents(
    credentials,
    new Date(Date.now())
  );

  console.log('eventsOnOutlookServer', eventsOnOutlookServer);

  const eventsOnRocketChatServer = await listEventsFromRocketChatServer(
    server.url,
    server.outlookCredentials.userId,
    token
  );
  console.log('eventsOnRocketChatServer', eventsOnRocketChatServer.data.length);

  const appointmentsFound = eventsOnOutlookServer.map(
    (appointment) => appointment.id
  );

  const externalEventsFromRocketChatServer =
    eventsOnRocketChatServer?.data.filter(
      ({ externalId }: { externalId?: string }) => externalId
    );

  for await (const appointment of eventsOnOutlookServer) {
    try {
      console.log('appointment', appointment.id);
      const alreadyOnRocketChatServer = externalEventsFromRocketChatServer.find(
        ({ externalId }: { externalId?: string }) =>
          externalId === appointment.id
      );

      const {
        id: externalId,
        subject,
        startTime,
        description,
        reminderMinutesBeforeStart,
      } = appointment;

      // If the appointment is not in the rocket.chat calendar for today, add it.
      if (!alreadyOnRocketChatServer) {
        console.log('createEventOnRocketChatServer');
        createEventOnRocketChatServer(
          server.url,
          server.outlookCredentials.userId,
          token,
          appointment
        );
        continue;
      }

      // If nothing on the event has changed, do nothing.
      if (
        alreadyOnRocketChatServer.subject === subject &&
        alreadyOnRocketChatServer.startTime === startTime &&
        alreadyOnRocketChatServer.description === description &&
        alreadyOnRocketChatServer.reminderMinutesBeforeStart ===
          reminderMinutesBeforeStart
      ) {
        console.log('nothing changed');
        continue;
      }

      // If the appointment is in the rocket.chat calendar for today, but something has changed, update it.
      console.log('updateEventOnRocketChatServer');
      await updateEventOnRocketChatServer(
        server.url,
        server.outlookCredentials.userId,
        token,
        alreadyOnRocketChatServer._id,
        appointment
      );
    } catch (error) {
      console.error('Error syncing event:', error);
    }
  }

  if (!eventsOnOutlookServer.length) {
    return;
  }

  for await (const event of eventsOnRocketChatServer.data) {
    if (!event.externalId || appointmentsFound.includes(event.externalId)) {
      continue;
    }

    try {
      await deleteEventOnRocketChatServer(
        server.url,
        server.outlookCredentials.userId,
        token,
        event._id
      );
    } catch (e) {
      console.error(e);
    }
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
      syncEventsWithRocketChatServer(server, userAPIToken);
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

function startRecurringSyncTask(server: Server, token: string) {
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
    // startRecurringSyncTask(server);
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
    async (event, _date: Date): Promise<OutlookEventsResponse> => {
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

      try {
        syncEventsWithRocketChatServer(server, userAPIToken);
      } catch (e) {
        console.error('Error syncing events with Rocket.Chat server', e);
      }

      if (saveCredentials) {
        startRecurringSyncTask(server, userAPIToken);
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
      const appointments: AppointmentData[] = [];
      return {
        status: 'success',
      };
    }
  );
};
