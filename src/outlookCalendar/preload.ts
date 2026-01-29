import { ipcRenderer } from 'electron';

import type { OutlookEventsResponse } from './type';

export const getOutlookEvents = async (
  date: Date
): Promise<OutlookEventsResponse> => {
  console.log(
    '[OutlookCalendar] Preload: Getting Outlook events for date:',
    date.toISOString()
  );

  try {
    const response = await ipcRenderer.invoke(
      'outlook-calendar/get-events',
      date
    );
    console.log(
      '[OutlookCalendar] Preload: Successfully got Outlook events response:',
      response
    );
    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[OutlookCalendar] Preload: Failed to get Outlook events:', {
      date: date.toISOString(),
      error: errorMessage,
    });
    throw new Error(`Failed to get Outlook events: ${errorMessage}`);
  }
};

export const setOutlookExchangeUrl = (url: string, userId: string): void => {
  console.log('[OutlookCalendar] Preload: Setting Exchange URL:', {
    url,
    userId,
  });

  try {
    ipcRenderer.invoke('outlook-calendar/set-exchange-url', url, userId);
    console.log('[OutlookCalendar] Preload: Successfully set Exchange URL');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[OutlookCalendar] Preload: Failed to set Exchange URL:', {
      url,
      userId,
      error: errorMessage,
    });
  }
};

export const hasOutlookCredentials = async (): Promise<boolean> => {
  console.log(
    '[OutlookCalendar] Preload: Checking if Outlook credentials exist'
  );

  try {
    const result = await ipcRenderer.invoke('outlook-calendar/has-credentials');
    console.log('[OutlookCalendar] Preload: Credentials check result:', result);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      '[OutlookCalendar] Preload: Failed to check credentials:',
      errorMessage
    );
    return false;
  }
};

export const clearOutlookCredentials = (): void => {
  console.log('[OutlookCalendar] Preload: Clearing Outlook credentials');

  try {
    ipcRenderer.invoke('outlook-calendar/clear-credentials');
    console.log('[OutlookCalendar] Preload: Successfully cleared credentials');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      '[OutlookCalendar] Preload: Failed to clear credentials:',
      errorMessage
    );
  }
};

export const setUserToken = (token: string, userId: string): void => {
  console.log(
    '[OutlookCalendar] Preload: Setting user token for userId:',
    userId
  );

  try {
    ipcRenderer.invoke('outlook-calendar/set-user-token', token, userId);
    console.log('[OutlookCalendar] Preload: Successfully set user token');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[OutlookCalendar] Preload: Failed to set user token:', {
      userId,
      error: errorMessage,
    });
  }
};
