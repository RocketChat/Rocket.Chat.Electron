import { ipcRenderer } from 'electron';

import { OutlookEventsResponse } from './type';

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
