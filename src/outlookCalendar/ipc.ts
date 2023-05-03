import { ipcMain, safeStorage } from 'electron';
import { Appointment } from 'ews-javascript-api';

import { selectPersistableValues } from '../app/selectors';
import { handle } from '../ipc/main';
import { Server } from '../servers/common';
import { dispatch, request, select } from '../store';
import { AppointmentData } from './AppointmentData';
import {
  OUTLOOK_CALENDAR_SET_CREDENTIALS,
  OUTLOOK_CALENDAR_ASK_CREDENTIALS,
  OUTLOOK_CALENDAR_DIALOG_DISMISSED,
  OUTLOOK_CALENDAR_SAVE_CREDENTIALS,
} from './actions';
import { getOutlookEvents } from './getOutlookEvents';
import { OutlookCredentials } from './type';

const getServerInformationByWebContentsId = (webContentsId: number): Server => {
  const { servers } = select(selectPersistableValues);
  const server = servers.find(
    (server) => server.webContentsId === webContentsId
  );
  return server || ({} as Server);
};

export const startOutlookCalendarUrlHandler = (): void => {
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
    'outlook-calendar/get-events',
    async (event, date: Date): Promise<AppointmentData[]> => {
      const server = getServerInformationByWebContentsId(event.id);
      const { outlookCredentials } = server;
      const isEncryptionAvailable = await safeStorage.isEncryptionAvailable();
      let credentials: OutlookCredentials;
      if (
        !outlookCredentials ||
        !outlookCredentials !== undefined ||
        !outlookCredentials.userId ||
        !outlookCredentials.serverUrl ||
        !outlookCredentials.login ||
        !outlookCredentials.password
      ) {
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

        credentials = response?.outlookCredentials;
        if (response.saveCredentials) {
          dispatch({
            type: OUTLOOK_CALENDAR_SAVE_CREDENTIALS,
            payload: {
              url: server.url,
              outlookCredentials: credentials,
            },
          });
        }
      } else {
        credentials = outlookCredentials;
      }

      let appointments: AppointmentData[] = [];
      appointments = await getOutlookEvents(credentials, date);

      return appointments;
    }
  );
};
