/* eslint-disable new-cap */
import { XhrApi } from '@ewsjs/xhr';
import type { Appointment } from 'ews-javascript-api';
import {
  FolderId,
  CalendarView,
  DateTime,
  WellKnownFolderName,
  BasePropertySet,
  PropertySet,
  ConfigurationApi,
  WebCredentials,
  ExchangeService,
  ExchangeVersion,
  Uri,
} from 'ews-javascript-api';

import type { OutlookCredentials, AppointmentData } from './type';

export const getOutlookEvents = async (
  credentials: OutlookCredentials,
  date: Date
): Promise<AppointmentData[]> => {
  const logs: { ts: Date; data: any[] }[] = [];
  const log = (...args: any[]) => logs.push({ ts: new Date(), data: args });

  try {
    log('getOutlookEvents started.');
    const { login, password, serverUrl } = credentials;

    log('Configuring NTLM Authentication');
    const xhrApi = new XhrApi({ decompress: true });
    xhrApi.useNtlmAuthentication(login, password);

    log('Enabling NTLM');
    ConfigurationApi.ConfigureXHR(xhrApi);

    log('Creating Exchange Service 2013');
    const exchange = new ExchangeService(ExchangeVersion.Exchange2013);
    // This credentials object isn't used when ntlm is active, but the lib still requires it.
    log('Creating placeholder Credentials');
    exchange.Credentials = new WebCredentials(login, password);
    log('Creating server URL');
    exchange.Url = new Uri(`${serverUrl}/ews/exchange.asmx`);

    log('Creating CalendarView');
    const validatedDate = new Date(date);

    const folderId = new FolderId(WellKnownFolderName.Calendar);
    const minTime = new DateTime(
      validatedDate.getFullYear(),
      validatedDate.getMonth() + 1,
      validatedDate.getDate()
    );
    const maxTime = new DateTime(
      validatedDate.getFullYear(),
      validatedDate.getMonth() + 1,
      validatedDate.getDate(),
      23,
      59,
      59
    );

    const view = new CalendarView(minTime, maxTime);
    let appointments: Appointment[] = [];

    try {
      log('Searching for Appointments');
      appointments = (await exchange.FindAppointments(folderId, view))
        .Items as Appointment[];
    } catch (error) {
      console.error('Error while searching for appointments');
      console.error(error);
      console.log(logs);
      return Promise.reject(error);
    }

    log('Search successful. Now filtering results.');
    // Filter out appointments that end exactly at midnight
    const filtered = appointments.filter(
      (appointment) => appointment.End > minTime
    );

    if (filtered.length === 0) {
      console.log('Outlook Request successful with no results.');
      return [];
    }

    log(
      `${filtered.length} results left after filter. Loading additional data for them.`
    );
    const propertySet = new PropertySet(BasePropertySet.FirstClassProperties);
    try {
      await exchange.LoadPropertiesForItems(filtered, propertySet);
    } catch (error) {
      console.error('Failed to load additional data for Appointments');
      console.error(error);
      console.log(logs);
      return Promise.reject(error);
    }

    log(
      'Operation completed successfully, now mapping data to standard format.'
    );
    return filtered.map<AppointmentData>((appointment) => {
      let description = '';
      try {
        if (appointment.Body?.Text) {
          description = appointment.Body.Text;
        }
      } catch {
        // Ignore errors when the appointment body is missing.
      }

      return {
        id: appointment.Id.UniqueId,
        subject: appointment.Subject,
        startTime: appointment.Start.ToISOString(),
        endTime: appointment.End.ToISOString(),
        description,
        isAllDay: appointment.IsAllDayEvent ?? false,
        isCanceled: appointment.IsCancelled ?? false,
        meetingUrl: appointment.JoinOnlineMeetingUrl ?? undefined,
        reminderMinutesBeforeStart:
          appointment.ReminderMinutesBeforeStart ?? undefined,
      };
    });
  } catch (error) {
    console.error('Operation failed.');
    console.error(error);
    console.log(logs);
    return Promise.reject(error);
  }
};
