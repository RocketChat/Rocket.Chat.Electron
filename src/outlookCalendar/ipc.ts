import https from 'https';

import axios from 'axios';
import { safeStorage } from 'electron';

import { selectPersistableValues } from '../app/selectors';
import { handle } from '../ipc/main';
import type { Server } from '../servers/common';
import { dispatch, request, select, watch } from '../store';
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

/**
 * Creates an HTTPS agent that bypasses certificate validation.
 * Used for air-gapped environments with self-signed or internal CA certificates.
 */
function createInsecureHttpsAgent(): https.Agent {
  return new https.Agent({ rejectUnauthorized: false });
}

async function listEventsFromRocketChatServer(
  serverUrl: string,
  userId: string,
  token: string,
  httpsAgent?: https.Agent
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
        httpsAgent,
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
  event: AppointmentData,
  httpsAgent?: https.Agent
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
      httpsAgent,
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
  event: AppointmentData,
  httpsAgent?: https.Agent
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
      httpsAgent,
    });
  } catch (error) {
    console.error('Error updating event on server:', error);
  }
}

async function deleteEventOnRocketChatServer(
  serverUrl: string,
  userId: string,
  token: string,
  rocketChatEventId: string,
  httpsAgent?: https.Agent
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
        httpsAgent,
      }
    );
  } catch (error) {
    console.error('Error deleting event on server:', error);
  }
}

export async function syncEventsWithRocketChatServer(
  serverUrl: string,
  credentials: OutlookCredentials,
  token: string,
  allowInsecure: boolean = false
) {
  if (!checkIfCredentialsAreNotEmpty(credentials)) return;

  // Create a single HTTPS agent instance to reuse across all requests in this sync
  const httpsAgent = allowInsecure ? createInsecureHttpsAgent() : undefined;

  const eventsOnOutlookServer = await getOutlookEvents(
    credentials,
    new Date(Date.now()),
    allowInsecure
  );

  const eventsOnRocketChatServer = await listEventsFromRocketChatServer(
    serverUrl,
    credentials.userId,
    token,
    httpsAgent
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
        await createEventOnRocketChatServer(
          serverUrl,
          credentials.userId,
          token,
          appointment,
          httpsAgent
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
        appointment,
        httpsAgent
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
        event._id,
        httpsAgent
      );
    } catch (e) {
      console.error(e);
    }
  }
}

let recurringSyncTaskId: NodeJS.Timeout;
let userAPIToken: string;
let currentServer: Server | null = null;
let restartDebounceTimer: NodeJS.Timeout | undefined;
let unsubscribeIntervalWatch: (() => void) | undefined;

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

  const allowInsecureOutlookConnections = select(
    (state) => state.allowInsecureOutlookConnections
  );

  try {
    await syncEventsWithRocketChatServer(
      server.url,
      credentials,
      userAPIToken,
      allowInsecureOutlookConnections
    );
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
  currentServer = server;
  const intervalMinutes = select(
    (state) =>
      state.outlookCalendarSyncIntervalOverride ??
      state.outlookCalendarSyncInterval
  );
  clearInterval(recurringSyncTaskId);
  recurringSyncTaskId = setInterval(
    () => recurringSyncTask(server),
    intervalMinutes * 60 * 1000
  );
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

    clearInterval(recurringSyncTaskId);
    clearTimeout(restartDebounceTimer);
    restartDebounceTimer = undefined;
    currentServer = null;
    userAPIToken = '';
    if (unsubscribeIntervalWatch) {
      unsubscribeIntervalWatch();
      unsubscribeIntervalWatch = undefined;
    }

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

      const allowInsecureOutlookConnections = select(
        (state) => state.allowInsecureOutlookConnections
      );

      try {
        await syncEventsWithRocketChatServer(
          server.url,
          credentials,
          userAPIToken,
          allowInsecureOutlookConnections
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

  unsubscribeIntervalWatch = watch(
    (state) =>
      state.outlookCalendarSyncIntervalOverride ??
      state.outlookCalendarSyncInterval,
    (curr, prev) => {
      if (prev === undefined || curr === prev) return;
      if (!currentServer || !userAPIToken) return;
      console.log(
        `Outlook sync interval changed to ${curr} minutes, rescheduling sync job`
      );
      clearTimeout(restartDebounceTimer);
      restartDebounceTimer = setTimeout(async () => {
        if (currentServer) {
          try {
            await maybeSyncEvents(currentServer);
          } catch (e) {
            console.error('Error syncing after interval change', e);
          }
          startRecurringSyncTask(currentServer);
        }
      }, 10000);
    }
  );
};

export const stopOutlookCalendarSync = (): void => {
  clearInterval(recurringSyncTaskId);
  clearTimeout(restartDebounceTimer);
  restartDebounceTimer = undefined;
  currentServer = null;
  userAPIToken = '';
  if (unsubscribeIntervalWatch) {
    unsubscribeIntervalWatch();
    unsubscribeIntervalWatch = undefined;
  }
};
