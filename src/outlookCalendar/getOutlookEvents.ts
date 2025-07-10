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
  console.log('[OutlookCalendar] Starting getOutlookEvents', {
    userId: credentials.userId,
    serverUrl: credentials.serverUrl,
    date: date.toISOString(),
    hasLogin: !!credentials.login,
    hasPassword: !!credentials.password,
  });

  try {
    const { login, password, serverUrl } = credentials;

    // Validate required credentials
    if (!login || !password || !serverUrl) {
      const error = new Error('Missing required Outlook credentials');
      console.error('[OutlookCalendar] Credential validation failed:', {
        hasLogin: !!login,
        hasPassword: !!password,
        hasServerUrl: !!serverUrl,
      });
      throw error;
    }

    console.log('[OutlookCalendar] Initializing Exchange connection');
    const xhrApi = new XhrApi({ decompress: true });
    xhrApi.useNtlmAuthentication(login, password);

    ConfigurationApi.ConfigureXHR(xhrApi);

    const exchange = new ExchangeService(ExchangeVersion.Exchange2013);
    // This credentials object isn't used when ntlm is active, but the lib still requires it.
    exchange.Credentials = new WebCredentials(login, password);

    try {
      exchange.Url = new Uri(`${serverUrl}/ews/exchange.asmx`);
      console.log(
        '[OutlookCalendar] Exchange URL set:',
        `${serverUrl}/ews/exchange.asmx`
      );
    } catch (error) {
      console.error('[OutlookCalendar] Failed to set Exchange URL:', error);
      throw new Error(`Invalid Exchange server URL: ${serverUrl}`);
    }

    const validatedDate = new Date(date);
    console.log(
      '[OutlookCalendar] Searching for appointments on:',
      validatedDate.toDateString()
    );

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
      console.log(
        '[OutlookCalendar] Fetching appointments from Exchange server...'
      );
      const findResult = await exchange.FindAppointments(folderId, view);
      appointments = findResult.Items as Appointment[];
      console.log(
        '[OutlookCalendar] Found',
        appointments.length,
        'appointments'
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorType =
        error instanceof Error ? error.constructor.name : 'Unknown';
      console.error(
        '[OutlookCalendar] Failed to fetch appointments from Exchange:',
        {
          error: errorMessage,
          serverUrl: credentials.serverUrl,
          userId: credentials.userId,
          errorType,
        }
      );
      return Promise.reject(
        new Error(`Failed to fetch appointments: ${errorMessage}`)
      );
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
      console.log(
        '[OutlookCalendar] Loading properties for',
        filtered.length,
        'appointments'
      );
      await exchange.LoadPropertiesForItems(filtered, propertySet);
      console.log(
        '[OutlookCalendar] Successfully loaded appointment properties'
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        '[OutlookCalendar] Failed to load appointment properties:',
        {
          error: errorMessage,
          appointmentCount: filtered.length,
          serverUrl: credentials.serverUrl,
        }
      );
      return Promise.reject(
        new Error(`Failed to load appointment properties: ${errorMessage}`)
      );
    }

    console.log(
      '[OutlookCalendar] Processing',
      filtered.length,
      'appointments'
    );
    return filtered.map<AppointmentData>((appointment, index) => {
      let description = '';
      try {
        if (appointment.Body?.Text) {
          description = appointment.Body.Text;
        }
      } catch (error) {
        console.warn(
          `[OutlookCalendar] Failed to get description for appointment ${index}:`,
          error
        );
        // Ignore errors when the appointment body is missing.
      }

      // Check if the busy status is Busy
      // LegacyFreeBusyStatus enum: Free = 0, Tentative = 1, Busy = 2, OOF = 3
      const isBusy =
        appointment.LegacyFreeBusyStatus === LegacyFreeBusyStatus.Busy;

      try {
        const appointmentData = {
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

        console.log(
          `[OutlookCalendar] Processed appointment ${index + 1}/${filtered.length}:`,
          {
            id: appointmentData.id,
            subject: appointmentData.subject,
            startTime: appointmentData.startTime,
            busy: appointmentData.busy,
          }
        );

        return appointmentData;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(
          `[OutlookCalendar] Failed to process appointment ${index}:`,
          {
            error: errorMessage,
            appointmentId: appointment.Id?.UniqueId,
            subject: appointment.Subject,
          }
        );
        throw new Error(`Failed to process appointment: ${errorMessage}`);
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[OutlookCalendar] getOutlookEvents failed:', {
      error: errorMessage,
      serverUrl: credentials.serverUrl,
      userId: credentials.userId,
      date: date.toISOString(),
    });
    return Promise.reject(
      new Error(`Outlook calendar sync failed: ${errorMessage}`)
    );
  }
};
