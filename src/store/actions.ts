import type { AppActionTypeToPayloadMap } from '../app/actions';
import type { DeepLinksActionTypeToPayloadMap } from '../deepLinks/actions';
import type { DownloadsActionTypeToPayloadMap } from '../downloads/actions';
import type { I18nActionTypeToPayloadMap } from '../i18n/actions';
import type { JitsiServerActionTypeToPayloadMap } from '../jitsi/actions';
import type { NavigationActionTypeToPayloadMap } from '../navigation/actions';
import type { NotificationsActionTypeToPayloadMap } from '../notifications/actions';
import type { OutlookCalendarActionTypeToPayloadMap } from '../outlookCalendar/actions';
import type { ScreenSharingActionTypeToPayloadMap } from '../screenSharing/actions';
import type { ServersActionTypeToPayloadMap } from '../servers/actions';
import type { SpellCheckingActionTypeToPayloadMap } from '../spellChecking/actions';
import type { UiActionTypeToPayloadMap } from '../ui/actions';
import type { UpdatesActionTypeToPayloadMap } from '../updates/actions';
import type { UserPresenceActionTypeToPayloadMap } from '../userPresence/actions';

type ActionTypeToPayloadMap = AppActionTypeToPayloadMap &
  DeepLinksActionTypeToPayloadMap &
  DownloadsActionTypeToPayloadMap &
  I18nActionTypeToPayloadMap &
  JitsiServerActionTypeToPayloadMap &
  NavigationActionTypeToPayloadMap &
  NotificationsActionTypeToPayloadMap &
  ScreenSharingActionTypeToPayloadMap &
  ServersActionTypeToPayloadMap &
  SpellCheckingActionTypeToPayloadMap &
  UiActionTypeToPayloadMap &
  UpdatesActionTypeToPayloadMap &
  UserPresenceActionTypeToPayloadMap &
  OutlookCalendarActionTypeToPayloadMap;

type RootActions = {
  [Type in keyof ActionTypeToPayloadMap]: void extends ActionTypeToPayloadMap[Type]
    ? {
        type: Type;
      }
    : {
        type: Type;
        payload: ActionTypeToPayloadMap[Type];
      };
};

export type ActionOf<Type extends keyof RootActions> = RootActions[Type];

export type RootAction = RootActions[keyof RootActions] & {
  ipcMeta?: ActionIPCMeta;
};

export type ActionIPCMeta = {
  type: 'single' | 'local';
  webContentsId?: number;
  viewInstanceId?: number;
};
