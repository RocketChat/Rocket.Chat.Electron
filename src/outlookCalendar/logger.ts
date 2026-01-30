import { select, watch } from '../store';

declare global {
  // eslint-disable-next-line no-var
  var isVerboseOutlookLoggingEnabled: boolean;
}

global.isVerboseOutlookLoggingEnabled = false;

const COLORS = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
} as const;

const prefix = `${COLORS.cyan}[OutlookCalendar]${COLORS.reset}`;

export const setupOutlookLogger = (): void => {
  global.isVerboseOutlookLoggingEnabled = select(
    ({ isVerboseOutlookLoggingEnabled }) => isVerboseOutlookLoggingEnabled
  );

  watch(
    ({ isVerboseOutlookLoggingEnabled }) => isVerboseOutlookLoggingEnabled,
    (enabled) => {
      global.isVerboseOutlookLoggingEnabled = enabled;
    }
  );
};

export const outlookLog = (...args: unknown[]): void => {
  if (global.isVerboseOutlookLoggingEnabled) {
    console.log(prefix, ...args);
  }
};

export const outlookDebug = (...args: unknown[]): void => {
  if (global.isVerboseOutlookLoggingEnabled) {
    console.debug(`${COLORS.blue}[OutlookCalendar]${COLORS.reset}`, ...args);
  }
};

export const outlookInfo = (...args: unknown[]): void => {
  if (global.isVerboseOutlookLoggingEnabled) {
    console.info(prefix, ...args);
  }
};

export const outlookWarn = (...args: unknown[]): void => {
  if (global.isVerboseOutlookLoggingEnabled) {
    console.warn(`${COLORS.yellow}[OutlookCalendar]${COLORS.reset}`, ...args);
  }
};

export const outlookError = (...args: unknown[]): void => {
  console.error(`${COLORS.red}[OutlookCalendar]${COLORS.reset}`, ...args);
};
