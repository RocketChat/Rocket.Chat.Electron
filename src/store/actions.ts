import { AppActionTypeToPayloadMap } from '../app/actions';
import { DeepLinksActionTypeToPayloadMap } from '../deepLinks/actions';
import { DownloadsActionTypeToPayloadMap } from '../downloads/actions';
import { I18nActionTypeToPayloadMap } from '../i18n/actions';
import { NavigationActionTypeToPayloadMap } from '../navigation/actions';
import { NotificationsActionTypeToPayloadMap } from '../notifications/actions';
import { ScreenSharingActionTypeToPayloadMap } from '../screenSharing/actions';
import { ServersActionTypeToPayloadMap } from '../servers/actions';
import { SpellCheckingActionTypeToPayloadMap } from '../spellChecking/actions';
import { UiActionTypeToPayloadMap } from '../ui/actions';
import { UpdatesActionTypeToPayloadMap } from '../updates/actions';
import { UserPresenceActionTypeToPayloadMap } from '../userPresence/actions';

type ActionTypeToPayloadMap = AppActionTypeToPayloadMap &
  DeepLinksActionTypeToPayloadMap &
  DownloadsActionTypeToPayloadMap &
  I18nActionTypeToPayloadMap &
  NavigationActionTypeToPayloadMap &
  NotificationsActionTypeToPayloadMap &
  ScreenSharingActionTypeToPayloadMap &
  ServersActionTypeToPayloadMap &
  SpellCheckingActionTypeToPayloadMap &
  UiActionTypeToPayloadMap &
  UpdatesActionTypeToPayloadMap &
  UserPresenceActionTypeToPayloadMap;

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

export type RootAction = RootActions[keyof RootActions];
