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
  meetingUrl?: string;
  reminderMinutesBeforeStart?: number;
  busy: boolean;
};

export type OutlookEventsResponse = { status: 'success' | 'canceled' };

export type ErrorSource =
  | 'exchange'
  | 'rocket_chat'
  | 'desktop_app'
  | 'network'
  | 'authentication'
  | 'configuration';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export type OutlookCalendarError = {
  source: ErrorSource;
  severity: ErrorSeverity;
  code: string;
  technicalMessage: string;
  userMessage: string;
  context: Record<string, any>;
  timestamp: string;
  suggestedActions?: string[];
};

export type ErrorClassification = {
  source: ErrorSource;
  severity: ErrorSeverity;
  code: string;
  userMessage: string;
  suggestedActions?: string[];
};
