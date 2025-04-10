import axios from 'axios';
import { safeStorage } from 'electron';

import { selectPersistableValues } from '../app/selectors';
import { handle } from '../ipc/main';
import type { Server } from '../servers/common';
import { dispatch, request, select } from '../store';
import * as urls from '../urls';
import { meetsMinimumVersion } from '../utils';
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

async function listEventsFromRocketChatServer(
  serverUrl: string,
  userId: string,
  token: string
) {
  try {
    const response = await axios.get(
      urls.server(serverUrl).calendarEvents.list,
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
    // Get server object to check version
    const { servers } = select(selectPersistableValues);
    const server = servers.find((server) => server.url === serverUrl);

    // Base payload
    const payload: Record<string, any> = {
      externalId: event.id,
      subject: event.subject,
      startTime: event.startTime,
      description: event.description,
      reminderMinutesBeforeStart: event.reminderMinutesBeforeStart,
    };

    // Add endTime and busy only for server version 7.5.0 or higher
    if (server?.version && meetsMinimumVersion(server.version, '7.5.0')) {
      payload.endTime = event.endTime;
      payload.busy = event.busy;
    }

    await axios.post(urls.server(serverUrl).calendarEvents.import, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': token,
        'X-User-Id': userId,
      },
    });
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
    // Get server object to check version
    const { servers } = select(selectPersistableValues);
    const server = servers.find((server) => server.url === serverUrl);

    // Base payload
    const payload: Record<string, any> = {
      eventId: rocketChatEventId,
      subject: event.subject,
      startTime: event.startTime,
      description: event.description,
      reminderMinutesBeforeStart: event.reminderMinutesBeforeStart,
    };

    // Add endTime and busy only for server version 7.5.0 or higher
    if (server?.version && meetsMinimumVersion(server.version, '7.5.0')) {
      payload.endTime = event.endTime;
      payload.busy = event.busy;
    }

    await axios.post(urls.server(serverUrl).calendarEvents.update, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': token,
        'X-User-Id': userId,
      },
    });
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
    await axios.post(
      urls.server(serverUrl).calendarEvents.delete,
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
  } catch (error) {
    console.error('Error deleting event on server:', error);
  }
}

export async function syncEventsWithRocketChatServer(
  serverUrl: string,
  credentials: OutlookCredentials,
  token: string
) {
  if (!checkIfCredentialsAreNotEmpty(credentials)) return;
  const eventsOnOutlookServer = await getOutlookEvents(
    credentials,
    new Date(Date.now())
  );

  const eventsOnRocketChatServer = await listEventsFromRocketChatServer(
    serverUrl,
    credentials.userId,
    token
  );

  const appointmentsFound = eventsOnOutlookServer.map(
    (appointment) => appointment.id
  );

  const externalEventsFromRocketChatServer =
    eventsOnRocketChatServer?.data.filter(
      ({ externalId }: { externalId?: string }) => externalId
    );

  // Get server object to check version
  const { servers } = select(selectPersistableValues);
  const server = servers.find((server) => server.url === serverUrl);

  for await (const appointment of eventsOnOutlookServer) {
    try {
      const alreadyOnRocketChatServer = externalEventsFromRocketChatServer.find(
        ({ externalId }: { externalId?: string }) =>
          externalId === appointment.id
      );

      const { subject, startTime, description, reminderMinutesBeforeStart } =
        appointment;

      // If the appointment is not in the rocket.chat calendar for today, add it.
      if (!alreadyOnRocketChatServer) {
        createEventOnRocketChatServer(
          serverUrl,
          credentials.userId,
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
          reminderMinutesBeforeStart &&
        (!server?.version ||
          !meetsMinimumVersion(server.version, '7.5.0') ||
          (alreadyOnRocketChatServer.endTime === appointment.endTime &&
            alreadyOnRocketChatServer.busy === appointment.busy))
      ) {
        continue;
      }

      // If the appointment is in the rocket.chat calendar for today, but something has changed, update it.
      await updateEventOnRocketChatServer(
        serverUrl,
        credentials.userId,
        token,
        alreadyOnRocketChatServer._id,
        appointment
      );
    } catch (error) {
      console.error('Error syncing event:', error);
    }
  }

  if (!eventsOnRocketChatServer.data.length) {
    return;
  }

  for await (const event of eventsOnRocketChatServer.data) {
    if (!event.externalId || appointmentsFound.includes(event.externalId)) {
      continue;
    }

    try {
      await deleteEventOnRocketChatServer(
        serverUrl,
        credentials.userId,
        token,
        event._id
      );
    } catch (e) {
      console.error(e);
    }
  }
}

let recurringSyncTaskId: NodeJS.Timeout;
let userAPIToken: string;

async function maybeSyncEvents(serverToSync: Server) {
  if (!userAPIToken) throw new Error('No user token');
  if (!serverToSync.webContentsId) throw new Error('No webContentsId');
  const server = getServerInformationByWebContentsId(
    serverToSync.webContentsId
  );
  if (!server.outlookCredentials) throw new Error('No credentials');
  const credentials = safeStorage.isEncryptionAvailable()
    ? decryptedCredentials(server.outlookCredentials)
    : server.outlookCredentials;

  if (!checkIfCredentialsAreNotEmpty(credentials))
    throw new Error('Credentials are empty');
  try {
    await syncEventsWithRocketChatServer(server.url, credentials, userAPIToken);
    console.log('Recurring task executed successfully');
  } catch (e) {
    console.error('Error sending events to server', e);
  }
}

async function recurringSyncTask(serverToSync: Server) {
  try {
    console.log('Executing recurring task');
    await maybeSyncEvents(serverToSync);
  } catch (error) {
    console.error('Error occurred:', error);
    clearInterval(recurringSyncTaskId);
  }
}

function startRecurringSyncTask(server: Server) {
  if (!userAPIToken) return;
  recurringSyncTaskId = setInterval(
    () => recurringSyncTask(server),
    60 * 60 * 1000
  ); // minutes * seconds * milliseconds
}

export const startOutlookCalendarUrlHandler = (): void => {
  handle('outlook-calendar/set-user-token', async (event, token, userId) => {
    userAPIToken = token;
    const server = getServerInformationByWebContentsId(event.id);
    if (!server) return;
    const { outlookCredentials } = server;
    if (!outlookCredentials) return;
    if (outlookCredentials.userId !== userId || !userAPIToken) return;
    if (!checkIfCredentialsAreNotEmpty(outlookCredentials)) return;
    startRecurringSyncTask(server);

    setImmediate(() => {
      try {
        maybeSyncEvents(server);
      } catch (e) {
        console.error('Failed to sync outlook events on startup.', e);
      }
    });
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
      const server = getServerInformationByWebContentsId(event.id);
      const { outlookCredentials } = server;
      if (
        // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
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
              isEncryptionAvailable: safeStorage.isEncryptionAvailable(),
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
        credentials = safeStorage.isEncryptionAvailable()
          ? decryptedCredentials(outlookCredentials)
          : outlookCredentials;
      }

      try {
        await syncEventsWithRocketChatServer(
          server.url,
          credentials,
          userAPIToken
        );
      } catch (e) {
        console.error('Error syncing events with Rocket.Chat server', e);
        return Promise.reject(e);
      }

      if (saveCredentials) {
        startRecurringSyncTask(server);
        dispatch({
          type: OUTLOOK_CALENDAR_SAVE_CREDENTIALS,
          payload: {
            url: server.url,
            outlookCredentials: safeStorage.isEncryptionAvailable()
              ? encryptedCredentials(credentials)
              : credentials,
          },
        });
      }
      return {
        status: 'success',
      };
    }
  );
};
