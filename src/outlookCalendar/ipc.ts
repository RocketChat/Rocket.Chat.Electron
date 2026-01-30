import https from 'https';

import axios from 'axios';
import { safeStorage, webContents } from 'electron';

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
import { outlookLog, outlookError, outlookWarn } from './logger';
import type {
  OutlookCredentials,
  AppointmentData,
  OutlookEventsResponse,
  RocketChatCalendarEvent,
  RocketChatEventsResponse,
} from './type';

type CrudOperationResult = {
  success: boolean;
  error?: Error;
};

const AXIOS_TIMEOUT_MS = 10_000;
const SYNC_INTERVAL_MS = 60 * 60 * 1000;
const INITIAL_SYNC_DEBOUNCE_MS = 100;

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
  outlookLog('Encrypting credentials for user:', credentials.userId);
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      outlookWarn(
        'Encryption not available, storing credentials in plain text'
      );
      return credentials;
    }

    const encryptedLogin = safeStorage
      .encryptString(credentials.login)
      .toString('base64');
    const encryptedPassword = safeStorage
      .encryptString(credentials.password)
      .toString('base64');

    outlookLog('Successfully encrypted credentials');
    return {
      ...credentials,
      login: encryptedLogin,
      password: encryptedPassword,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    outlookError('Failed to encrypt credentials:', {
      error: errorMessage,
      userId: credentials.userId,
      hasLogin: !!credentials.login,
      hasPassword: !!credentials.password,
    });
    throw new Error(`Failed to encrypt credentials: ${errorMessage}`);
  }
}

const isLikelyBase64 = (str: string): boolean => {
  if (!str || str.length < 4) return false;
  return /^[A-Za-z0-9+/]+=*$/.test(str) && str.length % 4 === 0;
};

function decryptedCredentials(
  credentials: OutlookCredentials
): OutlookCredentials {
  outlookLog('Decrypting credentials for user:', credentials.userId);

  if (!safeStorage.isEncryptionAvailable()) {
    outlookWarn('Encryption not available, using credentials as plaintext');
    return credentials;
  }

  const loginLooksEncrypted = isLikelyBase64(credentials.login);
  const passwordLooksEncrypted = isLikelyBase64(credentials.password);

  if (!loginLooksEncrypted || !passwordLooksEncrypted) {
    outlookWarn(
      'Credentials do not appear to be encrypted (legacy/plaintext), using as-is',
      { userId: credentials.userId }
    );
    return credentials;
  }

  try {
    const decryptedLogin = safeStorage
      .decryptString(Buffer.from(credentials.login, 'base64'))
      .toString();
    const decryptedPassword = safeStorage
      .decryptString(Buffer.from(credentials.password, 'base64'))
      .toString();

    outlookLog('Successfully decrypted credentials');
    return {
      ...credentials,
      login: decryptedLogin,
      password: decryptedPassword,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    outlookWarn(
      'Failed to decrypt credentials, falling back to plaintext (legacy credentials)',
      { userId: credentials.userId, error: errorMessage }
    );
    return credentials;
  }
}

async function listEventsFromRocketChatServer(
  serverUrl: string,
  userId: string,
  token: string
) {
  const url = urls.server(serverUrl).calendarEvents.list;
  outlookLog('Fetching events from Rocket.Chat server:', {
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
      timeout: AXIOS_TIMEOUT_MS,
      httpsAgent: new https.Agent({
        // rejectUnauthorized: false, // Allow self-signed certificates (disabled for production)
      }),
    });

    outlookLog('Successfully fetched events from server:', {
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

    outlookError(
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
): Promise<CrudOperationResult> {
  const url = urls.server(serverUrl).calendarEvents.import;
  outlookLog('Creating event on Rocket.Chat server:', {
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
      outlookLog('Including endTime and busy status (server version >= 7.5.0)');
    }

    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': token,
        'X-User-Id': userId,
      },
      timeout: AXIOS_TIMEOUT_MS,
      httpsAgent: new https.Agent({
        // rejectUnauthorized: false, // Allow self-signed certificates (disabled for production)
      }),
    });

    outlookLog('Successfully created event:', {
      eventId: event.id,
      statusCode: response.status,
      responseData: response.data,
    });
    return { success: true };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      outlookError('Axios error creating event:', {
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
      outlookError('Non-axios error creating event:', {
        url,
        eventId: event.id,
        error: errorMessage,
        userId,
      });
    }
    return { success: false, error: error as Error };
  }
}

async function updateEventOnRocketChatServer(
  serverUrl: string,
  userId: string,
  token: string,
  rocketChatEventId: string,
  event: AppointmentData
): Promise<CrudOperationResult> {
  const url = urls.server(serverUrl).calendarEvents.update;
  outlookLog('Updating event on Rocket.Chat server:', {
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
      outlookLog(
        'Including endTime and busy status for update (server version >= 7.5.0)'
      );
    }

    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': token,
        'X-User-Id': userId,
      },
      timeout: AXIOS_TIMEOUT_MS,
      httpsAgent: new https.Agent({
        // rejectUnauthorized: false, // Allow self-signed certificates (disabled for production)
      }),
    });

    outlookLog('Successfully updated event:', {
      rocketChatEventId,
      eventId: event.id,
      statusCode: response.status,
      responseData: response.data,
    });
    return { success: true };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      outlookError('Axios error updating event:', {
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
      outlookError('Non-axios error updating event:', {
        url,
        rocketChatEventId,
        eventId: event.id,
        error: errorMessage,
        userId,
      });
    }
    return { success: false, error: error as Error };
  }
}

async function deleteEventOnRocketChatServer(
  serverUrl: string,
  userId: string,
  token: string,
  rocketChatEventId: string
): Promise<CrudOperationResult> {
  const url = urls.server(serverUrl).calendarEvents.delete;
  outlookLog('Deleting event from Rocket.Chat server:', {
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
        timeout: AXIOS_TIMEOUT_MS,
        httpsAgent: new https.Agent({
          // rejectUnauthorized: false, // Allow self-signed certificates (disabled for production)
        }),
      }
    );

    outlookLog('Successfully deleted event:', {
      rocketChatEventId,
      statusCode: response.status,
      responseData: response.data,
    });
    return { success: true };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      outlookError('Axios error deleting event:', {
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
      outlookError('Non-axios error deleting event:', {
        url,
        rocketChatEventId,
        error: errorMessage,
        userId,
      });
    }
    return { success: false, error: error as Error };
  }
}

/**
 * Synchronizes Outlook calendar events with the Rocket.Chat server.
 *
 * This function implements sync coalescing: when a sync is already in progress,
 * subsequent sync requests are queued. Only the LAST queued sync actually runs,
 * as it contains the most recent state. Earlier queued syncs resolve immediately
 * since their changes would be superseded by the final sync.
 *
 * This prevents redundant API calls when multiple sync triggers fire in quick
 * succession (e.g., during app startup or rapid credential updates).
 *
 * @param serverUrl - The Rocket.Chat server URL
 * @param credentials - Outlook Exchange credentials
 * @param token - Rocket.Chat authentication token
 */
export async function syncEventsWithRocketChatServer(
  serverUrl: string,
  credentials: OutlookCredentials,
  token: string
) {
  // Validate token before doing anything else
  if (!token || typeof token !== 'string') {
    throw new Error(
      'Authentication required - please log in to Rocket.Chat first'
    );
  }

  const state = getServerState(serverUrl);

  // Check if sync is already in progress
  if (state.isSyncInProgress) {
    outlookLog('Sync already in progress, queueing this request');

    // Queue this sync request to run after current sync completes
    return new Promise<void>((resolve, reject) => {
      state.syncQueue.push({
        run: async () => {
          if (!token || typeof token !== 'string') {
            throw new Error(
              'Authentication required - please log in to Rocket.Chat first'
            );
          }
          await performSync(serverUrl, credentials, token);
        },
        resolve,
        reject,
      });
    });
  }

  // Set lock
  state.isSyncInProgress = true;

  try {
    await performSync(serverUrl, credentials, token);

    // Process queued syncs - loop until queue is truly empty
    // (new syncs can be queued while lastSync.run() executes)
    while (state.syncQueue.length > 0) {
      outlookLog(`Processing ${state.syncQueue.length} queued sync requests`);
      // Only process the last sync request (most recent state)
      const lastSync = state.syncQueue[state.syncQueue.length - 1];
      // Resolve all other queued syncs since the last one will cover them
      const skippedSyncs = state.syncQueue.slice(0, -1);
      state.syncQueue = [];

      for (const skipped of skippedSyncs) {
        skipped.resolve();
      }

      try {
        // eslint-disable-next-line no-await-in-loop -- Must drain queue sequentially
        await lastSync.run();
        lastSync.resolve();
      } catch (error) {
        outlookError('Queued sync failed:', error);
        lastSync.reject(error);
      }
    }
  } finally {
    // Release lock after all syncs complete
    state.isSyncInProgress = false;
  }
}

// eslint-disable-next-line complexity
async function performSync(
  serverUrl: string,
  credentials: OutlookCredentials,
  token: string
) {
  outlookLog(
    'Starting Outlook calendar synchronization for server:',
    serverUrl
  );

  if (!checkIfCredentialsAreNotEmpty(credentials)) return;

  outlookLog('Starting sync with Rocket.Chat server:', {
    serverUrl,
    userId: credentials.userId,
    hasToken: !!token,
  });

  // Validate input parameters
  if (!serverUrl || typeof serverUrl !== 'string') {
    throw new Error('Invalid server URL provided');
  }

  if (!credentials || typeof credentials !== 'object') {
    throw new Error('Invalid credentials provided');
  }

  // Token is already validated in syncEventsWithRocketChatServer

  let eventsOnOutlookServer: AppointmentData[];
  let eventsOnRocketChatServer: RocketChatEventsResponse | null;

  try {
    outlookLog('Fetching events from Outlook server...');
    eventsOnOutlookServer = await getOutlookEvents(
      credentials,
      new Date(Date.now())
    );
    outlookLog(
      'Found',
      eventsOnOutlookServer.length,
      'events on Outlook server'
    );

    outlookLog('Fetching events from Rocket.Chat server...');
    eventsOnRocketChatServer = await listEventsFromRocketChatServer(
      serverUrl,
      credentials.userId,
      token
    );

    // If we can't fetch events from the server, skip the sync
    if (!eventsOnRocketChatServer) {
      outlookLog('Skipping sync due to server connection issues');
      return;
    }

    outlookLog(
      'Found',
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

    outlookError(
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

  // Check for and clean up duplicate events
  const eventsByExternalId = new Map<string, RocketChatCalendarEvent[]>();
  for (const event of externalEventsFromRocketChatServer) {
    if (!eventsByExternalId.has(event.externalId!)) {
      eventsByExternalId.set(event.externalId!, []);
    }
    eventsByExternalId.get(event.externalId!)!.push(event);
  }

  // Collect all duplicate deletion promises
  const allDeletionPromises: Promise<void>[] = [];

  // Remove duplicates - keep only the first occurrence
  for (const [externalId, events] of eventsByExternalId) {
    if (events.length > 1) {
      outlookLog(
        `Found ${events.length} duplicate events for externalId: ${externalId}`
      );
      outlookLog('Keeping first event, deleting duplicates');

      // Delete all duplicates except the first one
      const deletionPromises = events.slice(1).map(async (duplicateEvent) => {
        outlookLog('Deleting duplicate event:', {
          rocketChatId: duplicateEvent._id,
          externalId: duplicateEvent.externalId,
          subject: duplicateEvent.subject,
        });

        try {
          await deleteEventOnRocketChatServer(
            serverUrl,
            credentials.userId,
            token,
            duplicateEvent._id
          );
        } catch (error) {
          outlookError('Failed to delete duplicate event:', {
            eventId: duplicateEvent._id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });

      allDeletionPromises.push(...deletionPromises);
    }
  }

  // Wait for all duplicate deletions to complete
  if (allDeletionPromises.length > 0) {
    outlookLog('Waiting for duplicate deletion to complete...');
    await Promise.all(allDeletionPromises);
    outlookLog('Duplicate deletion completed');
  }

  outlookLog(
    'Starting sync loop for',
    eventsOnOutlookServer.length,
    'Outlook events'
  );

  for await (const appointment of eventsOnOutlookServer) {
    try {
      outlookLog('Processing appointment:', {
        id: appointment.id,
        subject: appointment.subject,
        startTime: appointment.startTime,
      });

      // Use the deduplicated map to find the event (only first occurrence kept)
      const eventsForThisAppointment =
        eventsByExternalId.get(appointment.id) || [];
      const alreadyOnRocketChatServer = eventsForThisAppointment[0];

      const { subject, startTime, description, reminderMinutesBeforeStart } =
        appointment;

      // If the appointment is not in the rocket.chat calendar for today, add it.
      if (!alreadyOnRocketChatServer) {
        outlookLog('Creating new event in Rocket.Chat:', appointment.id);
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
        outlookLog('No changes detected for event:', appointment.id);
        continue;
      }

      // If the appointment is in the rocket.chat calendar for today, but something has changed, update it.
      outlookLog('Updating existing event in Rocket.Chat:', {
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
      outlookError('Error syncing individual event:', {
        appointmentId: appointment.id,
        subject: appointment.subject,
        error: errorMessage,
      });
      // Continue with other events even if one fails
    }
  }

  if (!eventsOnRocketChatServer?.data?.length) {
    outlookLog('No events on Rocket.Chat server to check for deletion');
    return;
  }

  outlookLog('Checking for events to delete from Rocket.Chat server');
  const eventsToDelete = eventsOnRocketChatServer.data.filter(
    (event: RocketChatCalendarEvent) =>
      event.externalId && !appointmentsFound.includes(event.externalId)
  );

  if (eventsToDelete.length === 0) {
    outlookLog('No events need to be deleted');
  } else {
    outlookLog('Found', eventsToDelete.length, 'events to delete');
  }

  for await (const event of eventsToDelete) {
    try {
      outlookLog('Deleting event from Rocket.Chat:', {
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
      outlookError('Error deleting individual event:', {
        eventId: event._id,
        externalId: event.externalId,
        subject: event.subject,
        error: errorMessage,
      });
      // Continue with other deletions even if one fails
    }
  }

  outlookLog('Sync completed successfully');
}

type QueuedSync = {
  run: () => Promise<void>;
  resolve: () => void;
  reject: (error: unknown) => void;
};

type ServerSyncState = {
  recurringSyncTaskId?: NodeJS.Timeout;
  userAPIToken?: string;
  initialSyncTimeoutId?: NodeJS.Timeout;
  isSyncInProgress: boolean;
  syncQueue: QueuedSync[];
};

const serverSyncStates = new Map<string, ServerSyncState>();

const getServerState = (serverUrl: string): ServerSyncState => {
  if (!serverSyncStates.has(serverUrl)) {
    serverSyncStates.set(serverUrl, {
      isSyncInProgress: false,
      syncQueue: [],
    });
  }
  return serverSyncStates.get(serverUrl)!;
};

const clearServerState = (serverUrl: string): void => {
  const state = serverSyncStates.get(serverUrl);
  if (state) {
    if (state.recurringSyncTaskId) {
      clearInterval(state.recurringSyncTaskId);
    }
    if (state.initialSyncTimeoutId) {
      clearTimeout(state.initialSyncTimeoutId);
    }
    serverSyncStates.delete(serverUrl);
  }
};

async function maybeSyncEvents(serverToSync: Server) {
  outlookLog('Starting maybeSyncEvents for server:', serverToSync.url);

  const state = getServerState(serverToSync.url);

  try {
    if (!state.userAPIToken) {
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

    outlookLog('Decrypting credentials...');
    const credentials = safeStorage.isEncryptionAvailable()
      ? decryptedCredentials(server.outlookCredentials)
      : server.outlookCredentials;

    if (!checkIfCredentialsAreNotEmpty(credentials)) {
      throw new Error('Outlook credentials are empty or invalid');
    }

    outlookLog('Starting sync with server:', server.url);
    await syncEventsWithRocketChatServer(
      server.url,
      credentials,
      state.userAPIToken
    );
    outlookLog('Sync task completed successfully');
  } catch (error) {
    const classifiedError = createClassifiedError(error as Error, {
      operation: 'maybe_sync_events',
      serverUrl: serverToSync.url,
      hasToken: !!state.userAPIToken,
      webContentsId: serverToSync.webContentsId,
    });

    outlookError(formatErrorForLogging(classifiedError, 'Maybe sync events'));
    throw error;
  }
}

async function recurringSyncTask(serverToSync: Server) {
  const state = getServerState(serverToSync.url);

  try {
    outlookLog('Executing recurring sync task for server:', serverToSync.url);
    await maybeSyncEvents(serverToSync);
    outlookLog('Recurring sync task completed successfully');
  } catch (error) {
    const classifiedError = createClassifiedError(error as Error, {
      operation: 'recurring_sync_task',
      serverUrl: serverToSync.url,
    });

    outlookError(formatErrorForLogging(classifiedError, 'Recurring sync task'));

    outlookLog('User-friendly error message for recurring sync:');
    outlookLog(generateUserFriendlyMessage(classifiedError));

    outlookLog('Stopping recurring sync due to persistent errors');
    if (state.recurringSyncTaskId) {
      clearInterval(state.recurringSyncTaskId);
      state.recurringSyncTaskId = undefined;
    }
  }
}

function startRecurringSyncTask(server: Server) {
  const state = getServerState(server.url);

  if (!state.userAPIToken) return;

  // Clear any existing recurring sync task to prevent duplicates
  if (state.recurringSyncTaskId) {
    outlookLog('Clearing existing recurring sync task');
    clearInterval(state.recurringSyncTaskId);
  }

  state.recurringSyncTaskId = setInterval(
    () => recurringSyncTask(server),
    SYNC_INTERVAL_MS
  );
}

export const startOutlookCalendarUrlHandler = (): void => {
  handle('outlook-calendar/set-user-token', async (event, token, userId) => {
    outlookLog('Setting user token for webContents:', event.id);

    try {
      if (!token || typeof token !== 'string') {
        outlookError('Invalid token provided');
        return;
      }

      if (!userId || typeof userId !== 'string') {
        outlookError('Invalid userId provided');
        return;
      }

      const server = getServerInformationByWebContentsId(event.id);
      if (!server?.url) {
        outlookError('Server not found for webContents:', event.id);
        return;
      }

      const state = getServerState(server.url);
      state.userAPIToken = token;
      outlookLog('User API token set successfully');

      const { outlookCredentials } = server;
      if (!outlookCredentials) {
        outlookLog('No Outlook credentials configured for server:', server.url);
        return;
      }

      if (outlookCredentials.userId !== userId) {
        outlookLog('User ID mismatch - credentials are for different user');
        return;
      }

      if (!state.userAPIToken) {
        outlookError('User API token is empty');
        return;
      }

      if (!checkIfCredentialsAreNotEmpty(outlookCredentials)) {
        outlookLog('Outlook credentials are empty');
        return;
      }

      outlookLog('Starting recurring sync task for server:', server.url);
      startRecurringSyncTask(server);

      // Cancel any pending initial sync to prevent duplicates
      if (state.initialSyncTimeoutId) {
        outlookLog('Cancelling pending initial sync');
        clearTimeout(state.initialSyncTimeoutId);
      }

      // Perform initial sync with debounce to prevent duplicate calls
      state.initialSyncTimeoutId = setTimeout(() => {
        outlookLog('Executing initial sync');
        maybeSyncEvents(server).catch((error) => {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          outlookError('Failed to sync outlook events on startup:', {
            serverUrl: server.url,
            userId,
            error: errorMessage,
          });
        });
      }, INITIAL_SYNC_DEBOUNCE_MS);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      outlookError('Error in set-user-token handler:', {
        webContentsId: event.id,
        userId,
        error: errorMessage,
      });
    }
  });

  handle('outlook-calendar/clear-credentials', async (event) => {
    const server = getServerInformationByWebContentsId(event.id);
    if (!server?.url) return;
    const { outlookCredentials } = server;
    if (!outlookCredentials) return;

    // Clear server sync state (stops recurring sync, clears timers)
    clearServerState(server.url);

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

  handle('outlook-calendar/has-credentials', async (event) => {
    const server = getServerInformationByWebContentsId(event.id);
    if (!server) return false;
    const { outlookCredentials } = server;
    if (!outlookCredentials) return false;
    return checkIfCredentialsAreNotEmpty(outlookCredentials);
  });

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

      const state = getServerState(server.url);

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
        // Check if user is logged in before attempting sync
        if (!state.userAPIToken) {
          outlookWarn('Manual sync attempted but token not available', {
            serverUrl: server.url,
            userId: outlookCredentials.userId,
            hint: 'Token is set by injected script when: 1) User is logged in, 2) Outlook is enabled in settings, 3) Exchange URL is configured',
          });

          // Try to get the token from the webContents
          outlookLog('Attempting to fetch token from webContents...');
          const contents = webContents.fromId(event.id);
          if (contents) {
            try {
              const token = await contents.executeJavaScript(
                `Meteor._localStorage?.getItem('Meteor.loginToken')`
              );
              if (token) {
                outlookLog('Successfully retrieved token from webContents');
                state.userAPIToken = token; // Store it for future use
                // Continue with sync using the retrieved token
                await syncEventsWithRocketChatServer(
                  server.url,
                  credentials,
                  token
                );
                return { status: 'success' };
              }
            } catch (error) {
              outlookError('Failed to get token from webContents:', error);
            }
          }

          return Promise.reject(
            new Error(
              'Authentication token not yet available. Please ensure: 1) You are logged into Rocket.Chat, 2) Outlook Calendar is enabled in settings, 3) Exchange URL is configured.'
            )
          );
        }

        await syncEventsWithRocketChatServer(
          server.url,
          credentials,
          state.userAPIToken
        );
      } catch (e) {
        const classifiedError = createClassifiedError(e as Error, {
          operation: 'sync_events_with_rocket_chat',
          serverUrl: server.url,
          userId: credentials.userId,
          hasToken: !!state.userAPIToken,
        });

        outlookError(
          formatErrorForLogging(
            classifiedError,
            'Sync events with Rocket.Chat server'
          )
        );

        outlookLog('User-friendly error message:');
        outlookLog(generateUserFriendlyMessage(classifiedError));

        throw e;
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
