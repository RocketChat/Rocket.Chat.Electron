import { select, watch } from '../store';

declare global {
  // eslint-disable-next-line no-var
  var isVerboseOutlookLoggingEnabled: boolean;
  // eslint-disable-next-line no-var
  var isDetailedEventsLoggingEnabled: boolean;
}

global.isVerboseOutlookLoggingEnabled = false;
global.isDetailedEventsLoggingEnabled = false;

const prefix = '[OutlookCalendar]';
const eventDetailPrefix = '[OutlookCalendar:Events]';

export const setupOutlookLogger = (): void => {
  global.isVerboseOutlookLoggingEnabled = select(
    ({ isVerboseOutlookLoggingEnabled }) => isVerboseOutlookLoggingEnabled
  );

  global.isDetailedEventsLoggingEnabled = select(
    ({ isDetailedEventsLoggingEnabled }) => isDetailedEventsLoggingEnabled
  );

  watch(
    ({ isVerboseOutlookLoggingEnabled }) => isVerboseOutlookLoggingEnabled,
    (enabled) => {
      global.isVerboseOutlookLoggingEnabled = enabled;
    }
  );

  watch(
    ({ isDetailedEventsLoggingEnabled }) => isDetailedEventsLoggingEnabled,
    (enabled) => {
      global.isDetailedEventsLoggingEnabled = enabled;
    }
  );
};

export const outlookLog = (...args: unknown[]): void => {
  if (global.isVerboseOutlookLoggingEnabled) {
    console.info(prefix, ...args);
  }
};

export const outlookDebug = (...args: unknown[]): void => {
  if (global.isVerboseOutlookLoggingEnabled) {
    console.info(prefix, ...args);
  }
};

export const outlookInfo = (...args: unknown[]): void => {
  if (global.isVerboseOutlookLoggingEnabled) {
    console.info(prefix, ...args);
  }
};

export const outlookWarn = (...args: unknown[]): void => {
  if (global.isVerboseOutlookLoggingEnabled) {
    console.warn(prefix, ...args);
  }
};

export const outlookError = (message: unknown, ...details: unknown[]): void => {
  if (global.isVerboseOutlookLoggingEnabled) {
    console.error(prefix, message, ...details);
  } else {
    console.error(prefix, message);
  }
};

export const outlookEventDetail = (...args: unknown[]): void => {
  if (global.isDetailedEventsLoggingEnabled) {
    console.info(eventDetailPrefix, ...args);
  }
};
