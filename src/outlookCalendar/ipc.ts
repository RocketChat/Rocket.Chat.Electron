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
import {
  createClassifiedError,
  formatErrorForLogging,
  generateUserFriendlyMessage,
} from './errorClassification';
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
  console.log(
    '[OutlookCalendar] Encrypting credentials for user:',
    credentials.userId
  );
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      console.warn(
        '[OutlookCalendar] Encryption not available, storing credentials in plain text'
      );
      return credentials;
    }

    const encryptedLogin = safeStorage
      .encryptString(credentials.login)
      .toString('base64');
    const encryptedPassword = safeStorage
      .encryptString(credentials.password)
      .toString('base64');

    console.log('[OutlookCalendar] Successfully encrypted credentials');
    return {
      ...credentials,
      login: encryptedLogin,
      password: encryptedPassword,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[OutlookCalendar] Failed to encrypt credentials:', {
      error: errorMessage,
      userId: credentials.userId,
      hasLogin: !!credentials.login,
      hasPassword: !!credentials.password,
    });
    throw new Error(`Failed to encrypt credentials: ${errorMessage}`);
  }
}

function decryptedCredentials(
  credentials: OutlookCredentials
): OutlookCredentials {
  console.log(
    '[OutlookCalendar] Decrypting credentials for user:',
    credentials.userId
  );
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      console.warn(
        '[OutlookCalendar] Encryption not available, credentials may be in plain text'
      );
      return credentials;
    }

    const decryptedLogin = safeStorage
      .decryptString(Buffer.from(credentials.login, 'base64'))
      .toString();
    const decryptedPassword = safeStorage
      .decryptString(Buffer.from(credentials.password, 'base64'))
      .toString();

    console.log('[OutlookCalendar] Successfully decrypted credentials');
    return {
      ...credentials,
      login: decryptedLogin,
      password: decryptedPassword,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[OutlookCalendar] Failed to decrypt credentials:', {
      error: errorMessage,
      userId: credentials.userId,
      loginLength: credentials.login?.length || 0,
      passwordLength: credentials.password?.length || 0,
    });
    throw new Error(`Failed to decrypt credentials: ${errorMessage}`);
  }
}

async function listEventsFromRocketChatServer(
  serverUrl: string,
  userId: string,
  token: string
) {
  const url = urls.server(serverUrl).calendarEvents.list;
  console.log('[OutlookCalendar] Fetching events from Rocket.Chat server:', {
    url,
    userId,
    hasToken: !!token,
  });

  try {
    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': token,
        'X-User-Id': userId,
      },
      params: {
        date: new Date().toISOString(),
      },
      timeout: 10000, // 10 second timeout
    });

    console.log('[OutlookCalendar] Successfully fetched events from server:', {
      statusCode: response.status,
      eventCount: response.data?.data?.length || 0,
    });

    return response.data;
  } catch (error) {
    const classifiedError = createClassifiedError(error as Error, {
      operation: 'fetch_events_from_rocket_chat',
      url,
      userId,
      isAxiosError: axios.isAxiosError(error),
      status: axios.isAxiosError(error) ? error.response?.status : undefined,
      statusText: axios.isAxiosError(error)
        ? error.response?.statusText
        : undefined,
      responseData: axios.isAxiosError(error)
        ? error.response?.data
        : undefined,
    });

    console.error(
      formatErrorForLogging(
        classifiedError,
        'Fetch events from Rocket.Chat server'
      )
    );
    return null;
  }
}

async function createEventOnRocketChatServer(
  serverUrl: string,
  userId: string,
  token: string,
  event: AppointmentData
) {
  const url = urls.server(serverUrl).calendarEvents.import;
  console.log('[OutlookCalendar] Creating event on Rocket.Chat server:', {
    url,
    eventId: event.id,
    subject: event.subject,
    userId,
  });

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
      console.log(
        '[OutlookCalendar] Including endTime and busy status (server version >= 7.5.0)'
      );
    }

    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': token,
        'X-User-Id': userId,
      },
      timeout: 10000, // 10 second timeout
    });

    console.log('[OutlookCalendar] Successfully created event:', {
      eventId: event.id,
      statusCode: response.status,
      responseData: response.data,
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('[OutlookCalendar] Axios error creating event:', {
        url,
        eventId: event.id,
        subject: event.subject,
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message,
        code: error.code,
        responseData: error.response?.data,
        userId,
      });
    } else {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('[OutlookCalendar] Non-axios error creating event:', {
        url,
        eventId: event.id,
        error: errorMessage,
        userId,
      });
    }
  }
}

async function updateEventOnRocketChatServer(
  serverUrl: string,
  userId: string,
  token: string,
  rocketChatEventId: string,
  event: AppointmentData
) {
  const url = urls.server(serverUrl).calendarEvents.update;
  console.log('[OutlookCalendar] Updating event on Rocket.Chat server:', {
    url,
    rocketChatEventId,
    eventId: event.id,
    subject: event.subject,
    userId,
  });

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
      console.log(
        '[OutlookCalendar] Including endTime and busy status for update (server version >= 7.5.0)'
      );
    }

    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': token,
        'X-User-Id': userId,
      },
      timeout: 10000, // 10 second timeout
    });

    console.log('[OutlookCalendar] Successfully updated event:', {
      rocketChatEventId,
      eventId: event.id,
      statusCode: response.status,
      responseData: response.data,
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('[OutlookCalendar] Axios error updating event:', {
        url,
        rocketChatEventId,
        eventId: event.id,
        subject: event.subject,
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message,
        code: error.code,
        responseData: error.response?.data,
        userId,
      });
    } else {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('[OutlookCalendar] Non-axios error updating event:', {
        url,
        rocketChatEventId,
        eventId: event.id,
        error: errorMessage,
        userId,
      });
    }
  }
}

async function deleteEventOnRocketChatServer(
  serverUrl: string,
  userId: string,
  token: string,
  rocketChatEventId: string
) {
  const url = urls.server(serverUrl).calendarEvents.delete;
  console.log('[OutlookCalendar] Deleting event from Rocket.Chat server:', {
    url,
    rocketChatEventId,
    userId,
  });

  try {
    const response = await axios.post(
      url,
      {
        eventId: rocketChatEventId,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token,
          'X-User-Id': userId,
        },
        timeout: 10000, // 10 second timeout
      }
    );

    console.log('[OutlookCalendar] Successfully deleted event:', {
      rocketChatEventId,
      statusCode: response.status,
      responseData: response.data,
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('[OutlookCalendar] Axios error deleting event:', {
        url,
        rocketChatEventId,
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message,
        code: error.code,
        responseData: error.response?.data,
        userId,
      });
    } else {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('[OutlookCalendar] Non-axios error deleting event:', {
        url,
        rocketChatEventId,
        error: errorMessage,
        userId,
      });
    }
  }
}

export async function syncEventsWithRocketChatServer(
  serverUrl: string,
  credentials: OutlookCredentials,
  token: string
) {
  console.info(
    'Starting Outlook calendar synchronization for server:',
    serverUrl
  );

  if (!checkIfCredentialsAreNotEmpty(credentials)) return;

  console.log('[OutlookCalendar] Starting sync with Rocket.Chat server:', {
    serverUrl,
    userId: credentials.userId,
    hasToken: !!token,
  });

  // Validate input parameters
  if (!serverUrl || typeof serverUrl !== 'string') {
    throw new Error('Invalid server URL provided');
  }

  if (!token || typeof token !== 'string') {
    throw new Error('Invalid authentication token provided');
  }

  if (!credentials || typeof credentials !== 'object') {
    throw new Error('Invalid credentials provided');
  }

  let eventsOnOutlookServer: AppointmentData[];
  let eventsOnRocketChatServer: any;

  try {
    console.log('[OutlookCalendar] Fetching events from Outlook server...');
    eventsOnOutlookServer = await getOutlookEvents(
      credentials,
      new Date(Date.now())
    );
    console.log(
      '[OutlookCalendar] Found',
      eventsOnOutlookServer.length,
      'events on Outlook server'
    );

    console.log('[OutlookCalendar] Fetching events from Rocket.Chat server...');
    eventsOnRocketChatServer = await listEventsFromRocketChatServer(
      serverUrl,
      credentials.userId,
      token
    );

    // If we can't fetch events from the server, skip the sync
    if (!eventsOnRocketChatServer) {
      console.log(
        '[OutlookCalendar] Skipping sync due to server connection issues'
      );
      return;
    }

    console.log(
      '[OutlookCalendar] Found',
      eventsOnRocketChatServer?.data?.length || 0,
      'events on Rocket.Chat server'
    );
  } catch (error) {
    const classifiedError = createClassifiedError(error as Error, {
      operation: 'fetch_events_during_sync',
      serverUrl,
      userId: credentials.userId,
      outlookServerUrl: credentials.serverUrl,
    });

    console.error(
      formatErrorForLogging(classifiedError, 'Fetch events during sync')
    );

    throw new Error(
      `Sync failed during event fetching: ${classifiedError.technicalMessage}`
    );
  }

  const appointmentsFound = eventsOnOutlookServer.map(
    (appointment) => appointment.id
  );

  const externalEventsFromRocketChatServer =
    eventsOnRocketChatServer?.data?.filter(
      ({ externalId }: { externalId?: string }) => externalId
    ) || [];

  // Get server object to check version
  const { servers } = select(selectPersistableValues);
  const server = servers.find((server) => server.url === serverUrl);

  console.log(
    '[OutlookCalendar] Starting sync loop for',
    eventsOnOutlookServer.length,
    'Outlook events'
  );

  for await (const appointment of eventsOnOutlookServer) {
    try {
      console.log('[OutlookCalendar] Processing appointment:', {
        id: appointment.id,
        subject: appointment.subject,
        startTime: appointment.startTime,
      });

      const alreadyOnRocketChatServer = externalEventsFromRocketChatServer.find(
        ({ externalId }: { externalId?: string }) =>
          externalId === appointment.id
      );

      const { subject, startTime, description, reminderMinutesBeforeStart } =
        appointment;

      // If the appointment is not in the rocket.chat calendar for today, add it.
      if (!alreadyOnRocketChatServer) {
        console.log(
          '[OutlookCalendar] Creating new event in Rocket.Chat:',
          appointment.id
        );
        await createEventOnRocketChatServer(
          serverUrl,
          credentials.userId,
          token,
          appointment
        );
        continue;
      }

      // If nothing on the event has changed, do nothing.
      const hasChanges = !(
        alreadyOnRocketChatServer.subject === subject &&
        alreadyOnRocketChatServer.startTime === startTime &&
        alreadyOnRocketChatServer.description === description &&
        alreadyOnRocketChatServer.reminderMinutesBeforeStart ===
          reminderMinutesBeforeStart &&
        (!server?.version ||
          !meetsMinimumVersion(server.version, '7.5.0') ||
          (alreadyOnRocketChatServer.endTime === appointment.endTime &&
            alreadyOnRocketChatServer.busy === appointment.busy))
      );

      if (!hasChanges) {
        console.log(
          '[OutlookCalendar] No changes detected for event:',
          appointment.id
        );
        continue;
      }

      // If the appointment is in the rocket.chat calendar for today, but something has changed, update it.
      console.log('[OutlookCalendar] Updating existing event in Rocket.Chat:', {
        rocketChatId: alreadyOnRocketChatServer._id,
        outlookId: appointment.id,
      });

      await updateEventOnRocketChatServer(
        serverUrl,
        credentials.userId,
        token,
        alreadyOnRocketChatServer._id,
        appointment
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('[OutlookCalendar] Error syncing individual event:', {
        appointmentId: appointment.id,
        subject: appointment.subject,
        error: errorMessage,
      });
      // Continue with other events even if one fails
    }
  }

  if (!eventsOnRocketChatServer?.data?.length) {
    console.log(
      '[OutlookCalendar] No events on Rocket.Chat server to check for deletion'
    );
    return;
  }

  console.log(
    '[OutlookCalendar] Checking for events to delete from Rocket.Chat server'
  );
  const eventsToDelete = eventsOnRocketChatServer.data.filter(
    (event: any) =>
      event.externalId && !appointmentsFound.includes(event.externalId)
  );

  if (eventsToDelete.length === 0) {
    console.log('[OutlookCalendar] No events need to be deleted');
  } else {
    console.log(
      '[OutlookCalendar] Found',
      eventsToDelete.length,
      'events to delete'
    );
  }

  for await (const event of eventsToDelete) {
    try {
      console.log('[OutlookCalendar] Deleting event from Rocket.Chat:', {
        rocketChatId: event._id,
        externalId: event.externalId,
        subject: event.subject,
      });

      await deleteEventOnRocketChatServer(
        serverUrl,
        credentials.userId,
        token,
        event._id
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('[OutlookCalendar] Error deleting individual event:', {
        eventId: event._id,
        externalId: event.externalId,
        subject: event.subject,
        error: errorMessage,
      });
      // Continue with other deletions even if one fails
    }
  }

  console.log('[OutlookCalendar] Sync completed successfully');
}

let recurringSyncTaskId: NodeJS.Timeout;
let userAPIToken: string;

async function maybeSyncEvents(serverToSync: Server) {
  console.log(
    '[OutlookCalendar] Starting maybeSyncEvents for server:',
    serverToSync.url
  );

  try {
    if (!userAPIToken) {
      throw new Error('No user API token available');
    }

    if (!serverToSync.webContentsId) {
      throw new Error('No webContentsId available for server');
    }

    const server = getServerInformationByWebContentsId(
      serverToSync.webContentsId
    );
    if (!server?.url) {
      throw new Error('Server information not found');
    }

    if (!server.outlookCredentials) {
      throw new Error('No Outlook credentials configured for server');
    }

    console.log('[OutlookCalendar] Decrypting credentials...');
    const credentials = safeStorage.isEncryptionAvailable()
      ? decryptedCredentials(server.outlookCredentials)
      : server.outlookCredentials;

    if (!checkIfCredentialsAreNotEmpty(credentials)) {
      throw new Error('Outlook credentials are empty or invalid');
    }

    console.log('[OutlookCalendar] Starting sync with server:', server.url);
    await syncEventsWithRocketChatServer(server.url, credentials, userAPIToken);
    console.log('[OutlookCalendar] Sync task completed successfully');
  } catch (error) {
    const classifiedError = createClassifiedError(error as Error, {
      operation: 'maybe_sync_events',
      serverUrl: serverToSync.url,
      hasToken: !!userAPIToken,
      webContentsId: serverToSync.webContentsId,
    });

    console.error(formatErrorForLogging(classifiedError, 'Maybe sync events'));
    throw error; // Re-throw to let calling function handle it
  }
}

async function recurringSyncTask(serverToSync: Server) {
  try {
    console.log(
      '[OutlookCalendar] Executing recurring sync task for server:',
      serverToSync.url
    );
    await maybeSyncEvents(serverToSync);
    console.log('[OutlookCalendar] Recurring sync task completed successfully');
  } catch (error) {
    const classifiedError = createClassifiedError(error as Error, {
      operation: 'recurring_sync_task',
      serverUrl: serverToSync.url,
    });

    console.error(
      formatErrorForLogging(classifiedError, 'Recurring sync task')
    );

    console.log(
      '[OutlookCalendar] User-friendly error message for recurring sync:'
    );
    console.log(generateUserFriendlyMessage(classifiedError));

    console.log(
      '[OutlookCalendar] Stopping recurring sync due to persistent errors'
    );
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
    console.log(
      '[OutlookCalendar] Setting user token for webContents:',
      event.id
    );

    try {
      if (!token || typeof token !== 'string') {
        console.error('[OutlookCalendar] Invalid token provided');
        return;
      }

      if (!userId || typeof userId !== 'string') {
        console.error('[OutlookCalendar] Invalid userId provided');
        return;
      }

      userAPIToken = token;
      console.log('[OutlookCalendar] User API token set successfully');

      const server = getServerInformationByWebContentsId(event.id);
      if (!server) {
        console.error(
          '[OutlookCalendar] Server not found for webContents:',
          event.id
        );
        return;
      }

      const { outlookCredentials } = server;
      if (!outlookCredentials) {
        console.log(
          '[OutlookCalendar] No Outlook credentials configured for server:',
          server.url
        );
        return;
      }

      if (outlookCredentials.userId !== userId) {
        console.log(
          '[OutlookCalendar] User ID mismatch - credentials are for different user'
        );
        return;
      }

      if (!userAPIToken) {
        console.error('[OutlookCalendar] User API token is empty');
        return;
      }

      if (!checkIfCredentialsAreNotEmpty(outlookCredentials)) {
        console.log('[OutlookCalendar] Outlook credentials are empty');
        return;
      }

      console.log(
        '[OutlookCalendar] Starting recurring sync task for server:',
        server.url
      );
      startRecurringSyncTask(server);

      // Perform initial sync
      setImmediate(() => {
        maybeSyncEvents(server).catch((error) => {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.error(
            '[OutlookCalendar] Failed to sync outlook events on startup:',
            {
              serverUrl: server.url,
              userId,
              error: errorMessage,
            }
          );
        });
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('[OutlookCalendar] Error in set-user-token handler:', {
        webContentsId: event.id,
        userId,
        error: errorMessage,
      });
    }
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
        const classifiedError = createClassifiedError(e as Error, {
          operation: 'sync_events_with_rocket_chat',
          serverUrl: server.url,
          userId: credentials.userId,
          hasToken: !!userAPIToken,
        });

        console.error(
          formatErrorForLogging(
            classifiedError,
            'Sync events with Rocket.Chat server'
          )
        );

        // Also log a user-friendly message that could be shown in UI
        console.log('[OutlookCalendar] User-friendly error message:');
        console.log(generateUserFriendlyMessage(classifiedError));

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
