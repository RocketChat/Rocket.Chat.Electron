import {
  FolderId,
  CalendarView,
  DateTime,
  WellKnownFolderName,
  Appointment,
  BasePropertySet,
  PropertySet,
} from 'ews-javascript-api';

import { createOutlookExchangeService } from './outlookCredentials';

require('dotenv').config();

export const getOutlookEvents = async (date: Date): Promise<Appointment[]> => {
  const exchange = await createOutlookExchangeService();

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
  const appointments = (await exchange?.FindAppointments(folderId, view))
    .Items as Appointment[];

  console.log(appointments);
  if (appointments.length === 0) {
    return [];
  }

  const propertySet = new PropertySet(BasePropertySet.FirstClassProperties);

  // eslint-disable-next-line new-cap
  await exchange.LoadPropertiesForItems(appointments, propertySet);

  return appointments;
};
