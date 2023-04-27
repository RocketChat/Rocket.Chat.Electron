import { ipcRenderer } from 'electron';

import { AppointmentData } from './AppointmentData';

export const getOutlookEvents = async (
  date: Date
): Promise<AppointmentData[]> => {
  const events = await ipcRenderer.invoke('outlook-calendar/get-events', date);
  return events;
};

export const setOutlookExchangeUrl = (url: string, userId: string): void => {
  ipcRenderer.invoke('outlook-calendar/set-exchange-url', url, userId);
};
