export type OutlookCredentials = {
  userId: string;
  serverUrl: string;
  login: string;
  password: string;
};

export type AppointmentData = {
  externalId?: string;
  _id?: string;
  id: string;
  subject: string;
  startTime: string;
  endTime: string;
  description: string;

  isAllDay: boolean;
  isCanceled: boolean;
  organizer?: string;
  meetingUrl?: string;
  reminderMinutesBeforeStart?: number;
  reminderDueBy?: string;
};

export type OutlookEventsResponse =
  | {
      status: 'success';
    }
  | {
      status: 'canceled';
    };
