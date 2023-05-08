export type OutlookCredentials = {
  userId: string;
  serverUrl: string;
  login: string;
  password: string;
};

export type AppointmentData = {
  id: string;
  subject: string;
  startTime: Date;
  endTime: Date;
  description: string;

  isAllDay: boolean;
  isCanceled: boolean;
  organizer?: string;
  meetingUrl?: string;
  reminderMinutesBeforeStart?: number;
  reminderDueBy?: Date;
};

export type OutlookEventsResponse =
  | {
      status: 'success';
      data: AppointmentData[];
    }
  | {
      status: 'canceled';
    };
