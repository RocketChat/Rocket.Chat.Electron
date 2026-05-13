import { app, clipboard, globalShortcut, Notification } from 'electron';

import { performTelephonyCall, parseTelephonyLink } from '../deepLinks/main';
import type { TelephonyLink } from '../deepLinks/main';
import { logger } from '../logging';
import { dispatch, watch } from '../store';
import type { RootState } from '../store/rootReducer';
import { getRootWindow } from '../ui/main/rootWindow';
import { TELEPHONY_GLOBAL_SHORTCUT_REGISTRATION_CHANGED } from './actions';
import type { TelephonyGlobalShortcutConfig } from './actions';

const selectTelephonyGlobalShortcutConfig = ({
  telephonyGlobalShortcutConfig,
}: RootState): TelephonyGlobalShortcutConfig => telephonyGlobalShortcutConfig;

let registeredAccelerator: string | null = null;
let unsubscribeFromShortcutConfig: (() => void) | null = null;

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

  const accelerator =
    typeof config.accelerator === 'string' && config.accelerator.trim()
      ? config.accelerator.trim()
      : null;

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
  const telephonyLink = createTelephonyLinkFromClipboardText(
    clipboard.readText()
  );

  await focusRootWindow();
  await performTelephonyCall(telephonyLink);
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

    new Notification({
      title: 'Rocket.Chat',
      body: `Telephony shortcut ${accelerator} could not be registered. It may already be in use.`,
    }).show();
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

  if (unsubscribeFromShortcutConfig) {
    unsubscribeFromShortcutConfig();
    unsubscribeFromShortcutConfig = null;
  }

  unregisterTelephonyGlobalShortcut();
};
