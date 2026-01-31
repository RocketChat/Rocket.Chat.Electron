import { select, watch } from '../store';

declare global {
  // eslint-disable-next-line no-var
  var isVerboseMainLoggingEnabled: boolean;
  // eslint-disable-next-line no-var
  var isVerboseAppLoggingEnabled: boolean;
  // eslint-disable-next-line no-var
  var isVerboseAuthLoggingEnabled: boolean;
  // eslint-disable-next-line no-var
  var isVerboseIpcLoggingEnabled: boolean;
  // eslint-disable-next-line no-var
  var isVerboseUiLoggingEnabled: boolean;
  // eslint-disable-next-line no-var
  var isVerboseUpdatesLoggingEnabled: boolean;
  // eslint-disable-next-line no-var
  var isVerboseNotificationsLoggingEnabled: boolean;
  // eslint-disable-next-line no-var
  var isVerboseVideoCallLoggingEnabled: boolean;
  // eslint-disable-next-line no-var
  var isVerboseServersLoggingEnabled: boolean;
  // eslint-disable-next-line no-var
  var isVerboseLogViewerLoggingEnabled: boolean;
}

global.isVerboseMainLoggingEnabled = false;
global.isVerboseAppLoggingEnabled = false;
global.isVerboseAuthLoggingEnabled = false;
global.isVerboseIpcLoggingEnabled = false;
global.isVerboseUiLoggingEnabled = false;
global.isVerboseUpdatesLoggingEnabled = false;
global.isVerboseNotificationsLoggingEnabled = false;
global.isVerboseVideoCallLoggingEnabled = false;
global.isVerboseServersLoggingEnabled = false;
global.isVerboseLogViewerLoggingEnabled = false;

export const setupVerboseLogging = (): void => {
  global.isVerboseMainLoggingEnabled = select(
    ({ isVerboseMainLoggingEnabled }) => isVerboseMainLoggingEnabled
  );
  watch(
    ({ isVerboseMainLoggingEnabled }) => isVerboseMainLoggingEnabled,
    (enabled) => {
      global.isVerboseMainLoggingEnabled = enabled;
    }
  );

  global.isVerboseAppLoggingEnabled = select(
    ({ isVerboseAppLoggingEnabled }) => isVerboseAppLoggingEnabled
  );
  watch(
    ({ isVerboseAppLoggingEnabled }) => isVerboseAppLoggingEnabled,
    (enabled) => {
      global.isVerboseAppLoggingEnabled = enabled;
    }
  );

  global.isVerboseAuthLoggingEnabled = select(
    ({ isVerboseAuthLoggingEnabled }) => isVerboseAuthLoggingEnabled
  );
  watch(
    ({ isVerboseAuthLoggingEnabled }) => isVerboseAuthLoggingEnabled,
    (enabled) => {
      global.isVerboseAuthLoggingEnabled = enabled;
    }
  );

  global.isVerboseIpcLoggingEnabled = select(
    ({ isVerboseIpcLoggingEnabled }) => isVerboseIpcLoggingEnabled
  );
  watch(
    ({ isVerboseIpcLoggingEnabled }) => isVerboseIpcLoggingEnabled,
    (enabled) => {
      global.isVerboseIpcLoggingEnabled = enabled;
    }
  );

  global.isVerboseUiLoggingEnabled = select(
    ({ isVerboseUiLoggingEnabled }) => isVerboseUiLoggingEnabled
  );
  watch(
    ({ isVerboseUiLoggingEnabled }) => isVerboseUiLoggingEnabled,
    (enabled) => {
      global.isVerboseUiLoggingEnabled = enabled;
    }
  );

  global.isVerboseUpdatesLoggingEnabled = select(
    ({ isVerboseUpdatesLoggingEnabled }) => isVerboseUpdatesLoggingEnabled
  );
  watch(
    ({ isVerboseUpdatesLoggingEnabled }) => isVerboseUpdatesLoggingEnabled,
    (enabled) => {
      global.isVerboseUpdatesLoggingEnabled = enabled;
    }
  );

  global.isVerboseNotificationsLoggingEnabled = select(
    ({ isVerboseNotificationsLoggingEnabled }) =>
      isVerboseNotificationsLoggingEnabled
  );
  watch(
    ({ isVerboseNotificationsLoggingEnabled }) =>
      isVerboseNotificationsLoggingEnabled,
    (enabled) => {
      global.isVerboseNotificationsLoggingEnabled = enabled;
    }
  );

  global.isVerboseVideoCallLoggingEnabled = select(
    ({ isVerboseVideoCallLoggingEnabled }) => isVerboseVideoCallLoggingEnabled
  );
  watch(
    ({ isVerboseVideoCallLoggingEnabled }) => isVerboseVideoCallLoggingEnabled,
    (enabled) => {
      global.isVerboseVideoCallLoggingEnabled = enabled;
    }
  );

  global.isVerboseServersLoggingEnabled = select(
    ({ isVerboseServersLoggingEnabled }) => isVerboseServersLoggingEnabled
  );
  watch(
    ({ isVerboseServersLoggingEnabled }) => isVerboseServersLoggingEnabled,
    (enabled) => {
      global.isVerboseServersLoggingEnabled = enabled;
    }
  );

  global.isVerboseLogViewerLoggingEnabled = select(
    ({ isVerboseLogViewerLoggingEnabled }) => isVerboseLogViewerLoggingEnabled
  );
  watch(
    ({ isVerboseLogViewerLoggingEnabled }) => isVerboseLogViewerLoggingEnabled,
    (enabled) => {
      global.isVerboseLogViewerLoggingEnabled = enabled;
    }
  );
};
