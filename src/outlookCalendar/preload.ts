import { ipcRenderer } from 'electron';

import type { OutlookEventsResponse } from './type';

export const getOutlookEvents = async (
  date: Date
): Promise<OutlookEventsResponse> => {
  const response = await ipcRenderer.invoke(
    'outlook-calendar/get-events',
    date
  );
  return response;
};

export const setOutlookExchangeUrl = (url: string, userId: string): void => {
  ipcRenderer.invoke('outlook-calendar/set-exchange-url', url, userId);
};

export const hasOutlookCredentials = async (): Promise<boolean> =>
  ipcRenderer.invoke('outlook-calendar/has-credentials');

export const clearOutlookCredentials = (): void => {
  ipcRenderer.invoke('outlook-calendar/clear-credentials');
};

export const setUserToken = (token: string, userId: string): void => {
  ipcRenderer.invoke('outlook-calendar/set-user-token', token, userId);
};
