import { spawn } from 'child_process';

import { app, clipboard, globalShortcut, Notification, shell } from 'electron';

import { TELEPHONY_SCHEMES } from '../app/main/app';
import { logger } from '../logging';
import { dispatch, listen, select, watch } from '../store';
import type { RootState } from '../store/rootReducer';
import {
  SIDE_BAR_SETTINGS_BUTTON_CLICKED,
  TELEPHONY_DEFAULT_HANDLER_PROMPT_OPEN,
  TELEPHONY_DEFAULT_HANDLER_PROMPT_OPEN_SETTINGS_CLICKED,
} from '../ui/actions';
import { getRootWindow } from '../ui/main/rootWindow';
import { TELEPHONY_GLOBAL_SHORTCUT_REGISTRATION_CHANGED } from './actions';
import type { TelephonyGlobalShortcutConfig } from './actions';
import type { TelephonyLink } from './common';
import { parseTelephonyLink } from './links';
import {
  MAX_CLIPBOARD_PHONE_LENGTH,
  isReservedTelephonyShortcutAccelerator,
  normalizeTelephonyShortcutAccelerator,
} from './shortcuts';

const selectTelephonyGlobalShortcutConfig = ({
  telephonyGlobalShortcutConfig,
  isTelephonyEnabled,
}: RootState): TelephonyGlobalShortcutConfig =>
  isTelephonyEnabled ? telephonyGlobalShortcutConfig : DISABLED_SHORTCUT_CONFIG;

const selectIsTelephonyEnabled = ({ isTelephonyEnabled }: RootState): boolean =>
  isTelephonyEnabled;

let registeredAccelerator: string | null = null;
let unsubscribeFromShortcutConfig: (() => void) | null = null;
let unsubscribeFromTelephonyEnabled: (() => void) | null = null;
let lastTelephonyShortcutTriggeredAt = 0;

const TELEPHONY_GLOBAL_SHORTCUT_DEBOUNCE_MS = 250;

const EMPTY_TELEPHONY_LINK: TelephonyLink = {
  phoneNumber: '',
  rawUri: '',
};

const DISABLED_SHORTCUT_CONFIG: TelephonyGlobalShortcutConfig = {
  enabled: false,
  accelerator: null,
};

const normalizeTelephonyGlobalShortcutConfig = (
  config: TelephonyGlobalShortcutConfig | null | undefined
): TelephonyGlobalShortcutConfig => {
  if (!config || typeof config !== 'object') {
    return DISABLED_SHORTCUT_CONFIG;
  }

  const accelerator = normalizeTelephonyShortcutAccelerator(config.accelerator);

  return {
    enabled: config.enabled === true,
    accelerator,
  };
};

const extractClipboardPhoneNumber = (text: string): string | null => {
  const trimmedText = text.trim();
  const digitCount = (trimmedText.match(/\d/g) ?? []).length;

  if (digitCount < 3) {
    return null;
  }

  return trimmedText;
};

export const createTelephonyLinkFromClipboardText = (
  text: string
): TelephonyLink => {
  const trimmedText = text.trim();
  if (!trimmedText || trimmedText.length > MAX_CLIPBOARD_PHONE_LENGTH) {
    return EMPTY_TELEPHONY_LINK;
  }

  const telephonyLink = parseTelephonyLink(trimmedText);
  if (telephonyLink) {
    return telephonyLink;
  }

  const phoneNumber = extractClipboardPhoneNumber(trimmedText);
  if (!phoneNumber) {
    return EMPTY_TELEPHONY_LINK;
  }

  return {
    phoneNumber,
    rawUri: trimmedText,
  };
};

const focusRootWindow = async (): Promise<void> => {
  const browserWindow = await getRootWindow();

  if (!browserWindow.isVisible()) {
    browserWindow.showInactive();
  }

  browserWindow.focus();
};

export const triggerTelephonyGlobalShortcut = async (): Promise<void> => {
  const now = Date.now();
  if (
    lastTelephonyShortcutTriggeredAt &&
    now - lastTelephonyShortcutTriggeredAt <
      TELEPHONY_GLOBAL_SHORTCUT_DEBOUNCE_MS
  ) {
    return;
  }
  lastTelephonyShortcutTriggeredAt = now;

  const telephonyLink = createTelephonyLinkFromClipboardText(
    clipboard.readText()
  );

  const { openTelephonyDialpad } = await import('./dialpad');

  await focusRootWindow();
  await openTelephonyDialpad(telephonyLink);
};

const notifyRegistrationFailure = (
  accelerator: string,
  error: string
): void => {
  logger.warn(error);

  try {
    if (!Notification.isSupported()) {
      return;
    }

    const notification = new Notification({
      title: 'Rocket.Chat',
      body: `Telephony shortcut ${accelerator} could not be registered. It may already be in use.`,
    });
    notification.addListener('click', () =>
      focusRootWindow()
        .catch((error) => {
          logger.warn(
            'Failed to focus Rocket.Chat from telephony shortcut notification'
          );
          logger.warn(error);
        })
        .finally(() => {
          dispatch({ type: SIDE_BAR_SETTINGS_BUTTON_CLICKED });
        })
    );
    notification.show();
  } catch (notificationError) {
    logger.warn('Failed to show telephony shortcut registration feedback');
    logger.warn(notificationError);
  }
};

const dispatchRegistrationStatus = (
  registered: boolean,
  accelerator: string | null,
  error: string | null
): void => {
  dispatch({
    type: TELEPHONY_GLOBAL_SHORTCUT_REGISTRATION_CHANGED,
    payload: {
      registered,
      accelerator,
      error,
    },
  });
};

export const unregisterTelephonyGlobalShortcut = (): void => {
  if (registeredAccelerator) {
    globalShortcut.unregister(registeredAccelerator);
    registeredAccelerator = null;
  }

  dispatchRegistrationStatus(false, null, null);
};

export const registerTelephonyGlobalShortcut = (
  config: TelephonyGlobalShortcutConfig | null | undefined
): void => {
  const { enabled, accelerator } =
    normalizeTelephonyGlobalShortcutConfig(config);

  unregisterTelephonyGlobalShortcut();

  if (!enabled || !accelerator) {
    return;
  }

  try {
    if (isReservedTelephonyShortcutAccelerator(accelerator)) {
      const error = `Telephony shortcut ${accelerator} is reserved by the app or operating system`;
      dispatchRegistrationStatus(false, accelerator, error);
      notifyRegistrationFailure(accelerator, error);
      return;
    }

    if (globalShortcut.isRegistered?.(accelerator)) {
      const error = `Telephony shortcut ${accelerator} is already registered`;
      dispatchRegistrationStatus(false, accelerator, error);
      notifyRegistrationFailure(accelerator, error);
      return;
    }

    const registered = globalShortcut.register(accelerator, () => {
      void triggerTelephonyGlobalShortcut().catch((error) => {
        logger.error('Failed to handle telephony global shortcut', error);
      });
    });

    if (!registered) {
      const error = `Telephony shortcut ${accelerator} registration failed`;
      dispatchRegistrationStatus(false, accelerator, error);
      notifyRegistrationFailure(accelerator, error);
      return;
    }

    registeredAccelerator = accelerator;
    dispatchRegistrationStatus(true, accelerator, null);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failureMessage = `Telephony shortcut ${accelerator} registration failed: ${message}`;
    dispatchRegistrationStatus(false, accelerator, failureMessage);
    notifyRegistrationFailure(accelerator, failureMessage);
  }
};

export const setupTelephonyGlobalShortcut = (): void => {
  if (unsubscribeFromShortcutConfig) {
    return;
  }

  unsubscribeFromShortcutConfig = watch(
    selectTelephonyGlobalShortcutConfig,
    (config) => {
      registerTelephonyGlobalShortcut(config);
    }
  );

  app.addListener('will-quit', teardownTelephonyGlobalShortcut);
};

export const teardownTelephonyGlobalShortcut = (): void => {
  app.removeListener('will-quit', teardownTelephonyGlobalShortcut);
  lastTelephonyShortcutTriggeredAt = 0;

  if (unsubscribeFromShortcutConfig) {
    unsubscribeFromShortcutConfig();
    unsubscribeFromShortcutConfig = null;
  }

  unregisterTelephonyGlobalShortcut();
};

const applyTelephonyProtocolRegistration = (enabled: boolean): void => {
  for (const scheme of TELEPHONY_SCHEMES) {
    try {
      if (enabled) {
        app.setAsDefaultProtocolClient(scheme);
      } else {
        app.removeAsDefaultProtocolClient(scheme);
      }
    } catch (error) {
      logger.warn(
        `Failed to ${
          enabled ? 'register' : 'unregister'
        } telephony protocol handler for ${scheme}:`
      );
      logger.warn(error);
    }
  }
};

export const setupTelephonyProtocolHandlers = (): void => {
  if (unsubscribeFromTelephonyEnabled) {
    return;
  }

  unsubscribeFromTelephonyEnabled = watch(
    selectIsTelephonyEnabled,
    (enabled) => {
      applyTelephonyProtocolRegistration(enabled);
    }
  );

  app.addListener('will-quit', teardownTelephonyProtocolHandlers);
};

export const teardownTelephonyProtocolHandlers = (): void => {
  app.removeListener('will-quit', teardownTelephonyProtocolHandlers);

  if (unsubscribeFromTelephonyEnabled) {
    unsubscribeFromTelephonyEnabled();
    unsubscribeFromTelephonyEnabled = null;
  }
};

let unsubscribeFromDefaultHandlerPrompt: (() => void) | null = null;
let unsubscribeFromDefaultHandlerSettingsListener: (() => void) | null = null;
let lastTelephonyEnabledForPrompt = false;

const openSystemDefaultAppsSettings = (): void => {
  if (process.platform === 'win32') {
    try {
      void shell.openExternal('ms-settings:defaultapps');
    } catch (error) {
      logger.warn('Failed to open Windows default apps settings');
      logger.warn(error);
    }
  } else if (process.platform === 'darwin') {
    void shell.openExternal(
      'x-apple.systempreferences:com.apple.preferences.FaceTime'
    );
  } else if (process.platform === 'linux') {
    try {
      const desktop = (process.env.XDG_CURRENT_DESKTOP ?? '')
        .toUpperCase()
        .trim();

      if (
        desktop.includes('GNOME') ||
        desktop.includes('UNITY') ||
        desktop.includes('CINNAMON')
      ) {
        spawn('gnome-control-center', ['default-apps'], {
          detached: true,
          stdio: 'ignore',
        }).unref();
      } else if (desktop.includes('KDE') || desktop.includes('PLASMA')) {
        const child = spawn('kcmshell5', ['componentchooser'], {
          detached: true,
          stdio: 'ignore',
        });
        child.on('error', (error: NodeJS.ErrnoException) => {
          if (error.code === 'ENOENT') {
            spawn('kcmshell6', ['componentchooser'], {
              detached: true,
              stdio: 'ignore',
            }).unref();
          }
        });
        child.unref();
      } else {
        logger.info(
          `No known default-apps settings command for desktop environment: ${desktop}`
        );
      }
    } catch (error) {
      logger.warn('Failed to open Linux default apps settings');
      logger.warn(error);
    }
  } else {
    logger.info(
      `openSystemDefaultAppsSettings: no-op on platform ${process.platform}`
    );
  }
};

export const setupTelephonyDefaultHandlerPrompt = (): void => {
  if (unsubscribeFromDefaultHandlerPrompt) {
    return;
  }

  lastTelephonyEnabledForPrompt = select(selectIsTelephonyEnabled);

  unsubscribeFromDefaultHandlerPrompt = watch(
    selectIsTelephonyEnabled,
    (enabled) => {
      if (enabled && !lastTelephonyEnabledForPrompt) {
        dispatch({ type: TELEPHONY_DEFAULT_HANDLER_PROMPT_OPEN });
      }
      lastTelephonyEnabledForPrompt = enabled;
    }
  );

  unsubscribeFromDefaultHandlerSettingsListener = listen(
    TELEPHONY_DEFAULT_HANDLER_PROMPT_OPEN_SETTINGS_CLICKED,
    () => {
      openSystemDefaultAppsSettings();
    }
  );

  app.addListener('will-quit', teardownTelephonyDefaultHandlerPrompt);
};

export const teardownTelephonyDefaultHandlerPrompt = (): void => {
  app.removeListener('will-quit', teardownTelephonyDefaultHandlerPrompt);

  if (unsubscribeFromDefaultHandlerPrompt) {
    unsubscribeFromDefaultHandlerPrompt();
    unsubscribeFromDefaultHandlerPrompt = null;
  }

  if (unsubscribeFromDefaultHandlerSettingsListener) {
    unsubscribeFromDefaultHandlerSettingsListener();
    unsubscribeFromDefaultHandlerSettingsListener = null;
  }

  lastTelephonyEnabledForPrompt = false;
};
