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
  LegacyFreeBusyStatus,
} from 'ews-javascript-api';

import type { OutlookCredentials, AppointmentData } from './type';

export const getOutlookEvents = async (
  credentials: OutlookCredentials,
  date: Date
): Promise<AppointmentData[]> => {
  try {
    const { login, password, serverUrl } = credentials;

    const xhrApi = new XhrApi({ decompress: true });
    xhrApi.useNtlmAuthentication(login, password);

    ConfigurationApi.ConfigureXHR(xhrApi);

    const exchange = new ExchangeService(ExchangeVersion.Exchange2013);
    // This credentials object isn't used when ntlm is active, but the lib still requires it.
    exchange.Credentials = new WebCredentials(login, password);
    exchange.Url = new Uri(`${serverUrl}/ews/exchange.asmx`);

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
      appointments = (await exchange.FindAppointments(folderId, view))
        .Items as Appointment[];
    } catch (error) {
      console.error(error);
      return Promise.reject(error);
    }
    // Filter out appointments that end exactly at midnight
    const filtered = appointments.filter(
      (appointment) => appointment.End > minTime
    );

    if (filtered.length === 0) {
      return [];
    }

    const propertySet = new PropertySet(BasePropertySet.FirstClassProperties);
    try {
      await exchange.LoadPropertiesForItems(filtered, propertySet);
    } catch (error) {
      return Promise.reject(error);
    }

    return filtered.map<AppointmentData>((appointment) => {
      let description = '';
      try {
        if (appointment.Body?.Text) {
          description = appointment.Body.Text;
        }
      } catch {
        // Ignore errors when the appointment body is missing.
      }

      // Check if the busy status is Busy
      // LegacyFreeBusyStatus enum: Free = 0, Tentative = 1, Busy = 2, OOF = 3
      const isBusy =
        appointment.LegacyFreeBusyStatus === LegacyFreeBusyStatus.Busy;

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
        busy: isBusy,
      };
    });
  } catch (error) {
    console.error(error);
    return Promise.reject(error);
  }
};
