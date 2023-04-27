/* eslint-disable new-cap */
import { XhrApi } from '@ewsjs/xhr';
import {
  FolderId,
  CalendarView,
  DateTime,
  WellKnownFolderName,
  Appointment,
  BasePropertySet,
  PropertySet,
  ConfigurationApi,
  WebCredentials,
  ExchangeService,
  ExchangeVersion,
  Uri,
} from 'ews-javascript-api';

import type { AppointmentData } from './AppointmentData';
import { OutlookCredentials } from './type';

require('dotenv').config();

export const getOutlookEvents = async (
  credentials: OutlookCredentials,
  date: Date
): Promise<AppointmentData[]> => {
  const outlookUser = process.env.OUTLOOK_USER || 'pierre';
  const outlookPassword = process.env.OUTLOOK_PASSWORD || '--20CAceta';
  const outlookServer =
    process.env.OUTLOOK_SERVER ||
    'https://owa.dev.rocket.chat/EWS/Exchange.asmx';

  const xhrApi = new XhrApi({ gzip: true });
  xhrApi.useNtlmAuthentication(outlookUser, outlookPassword);

  ConfigurationApi.ConfigureXHR(xhrApi);

  const exchange = new ExchangeService(ExchangeVersion.Exchange2013);
  // This credentials object isn't used when ntlm is active, but the lib still requires it.
  exchange.Credentials = new WebCredentials(outlookUser, outlookPassword);
  exchange.Url = new Uri(`${outlookServer}/ews/exchange.asmx`);

  const validated_date = new Date(date);

  const folderId = new FolderId(WellKnownFolderName.Calendar);
  const minTime = new DateTime(
    validated_date.getFullYear(),
    validated_date.getMonth() + 1,
    validated_date.getDate()
  );
  const maxTime = new DateTime(
    validated_date.getFullYear(),
    validated_date.getMonth() + 1,
    validated_date.getDate(),
    23,
    59,
    59
  );

  const view = new CalendarView(minTime, maxTime);

  const appointments = (await exchange.FindAppointments(folderId, view))
    .Items as Appointment[];

  // Filter out appointments that end exactly at midnight
  const filtered = appointments.filter(
    (appointment) => appointment.End > minTime
  );

  if (appointments.length === 0) {
    return [];
  }

  const propertySet = new PropertySet(BasePropertySet.FirstClassProperties);
  await exchange.LoadPropertiesForItems(filtered, propertySet);
  return filtered.map<AppointmentData>((appointment) => ({
    id: appointment.Id.UniqueId,
    subject: appointment.Subject,
    startTime: new Date(appointment.Start.ToISOString()),
    endTime: new Date(appointment.End.ToISOString()),
    description: appointment.Body?.Text || '',
    isAllDay: appointment.IsAllDayEvent ?? false,
    isCanceled: appointment.IsCancelled ?? false,
    organizer: appointment.Organizer?.Name || undefined,
    meetingUrl: appointment.JoinOnlineMeetingUrl ?? undefined,
    reminderMinutesBeforeStart:
      appointment.ReminderMinutesBeforeStart ?? undefined,
    reminderDueBy: appointment.ReminderDueBy
      ? new Date(appointment.ReminderDueBy.ToISOString())
      : undefined,
  }));
};
