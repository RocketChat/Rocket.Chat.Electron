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
