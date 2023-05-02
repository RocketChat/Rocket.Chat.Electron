import { Appointment } from 'ews-javascript-api';

import { selectPersistableValues } from '../app/selectors';
import { handle } from '../ipc/main';
import { Server } from '../servers/common';
import { dispatch, select } from '../store';
import { OUTLOOK_CALENDAR_ASK_CREDENTIALS } from '../ui/actions';
import { OUTLOOK_CALENDAR_SET_CREDENTIALS } from './actions';
import { getOutlookEvents } from './getOutlookEvents';

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
          type: OUTLOOK_CALENDAR_SET_CREDENTIALS,
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

  handle('outlook-calendar/get-events', async (event, date: Date) => {
    console.log('[Rocket.Chat Desktop] outlook-calendar/get-events', date);
    const server = getServerInformationByWebContentsId(event.id);
    const { outlookCredentials } = server;
    if (
      !outlookCredentials ||
      !outlookCredentials.login ||
      !outlookCredentials.password
    ) {
      dispatch({
        type: OUTLOOK_CALENDAR_ASK_CREDENTIALS,
        payload: { server, userId: outlookCredentials?.userId },
      });
    }
    const appointments = await getOutlookEvents(outlookCredentials, date);
    return appointments;
  });
};
