import {
  ExchangeService,
  ExchangeVersion,
  Uri,
  FolderId,
  CalendarView,
  DateTime,
  WellKnownFolderName,
  WebCredentials,
  Appointment,
  BasePropertySet,
  PropertySet,
} from 'ews-javascript-api';

require('dotenv').config();

export const getOutlookEvents = async (date: Date): Promise<Appointment[]> => {
  const exchange = new ExchangeService(ExchangeVersion.Exchange2013);

  const outlookUser = `${process.env.OUTLOOK_DOMAIN}\\${process.env.OUTLOOK_USER}`;
  const outlookPassword = process.env.OUTLOOK_PASSWORD || '';
  const outlookServer = process.env.OUTLOOK_SERVER || '';

  // exchange.Credentials = new TokenCredentials(token);
  exchange.Credentials = new WebCredentials(outlookUser, outlookPassword);
  // exchange.Url = new Uri(server);
  exchange.Url = new Uri(outlookServer);

  const folderId = new FolderId(WellKnownFolderName.Calendar);
  const view = new CalendarView(
    new DateTime(date.getFullYear(), date.getMonth() + 1, date.getDate()),
    new DateTime(
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate(),
      23,
      59,
      59
    )
  );

  // eslint-disable-next-line new-cap
  const appointments = (await exchange.FindAppointments(folderId, view))
    .Items as Appointment[];

  console.log(appointments);

  const propertySet = new PropertySet(BasePropertySet.FirstClassProperties);

  // eslint-disable-next-line new-cap
  await exchange.LoadPropertiesForItems(appointments, propertySet);

  return appointments;
};
